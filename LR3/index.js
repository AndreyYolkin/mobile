import csv from "neat-csv"
import os from "os"
import child_process from "child_process"
import fs from "fs"
import path from "path"
import ECT from "ect"
import pdf from "html-pdf"
import open from "open"


let texts = {
  bank: "Бета Банк",
  bik: "010273002",
  sc1: "40101010350041010001",
  sc2: "80101010350041010001",
  inn: "2800103000",
  kpp: "273601001",
  name: "Тригереев Колбек",
  number: "22",
  date: "21.03.2020",
  links: [],
  sum: 0,
  nds: 0
}

const NUMBER = "915642913";
const k = { origin: { cost: 1, treshold: 0 }, dest: { cost: 1, treshold: 0 }, sms: { cost: 1, treshold: 5 } }

function calculate_mobile(data) {
  return new Promise((resolve) => {
    let origin = [], dest = []
    origin = data.filter(el => el.msisdn_origin == NUMBER)
    dest = data.filter(el => el.msisdn_dest == NUMBER)
    let origincost = Math.max(origin.reduce((a, i) => a + (+i.call_duration), 0) - k.origin.treshold, 0) * k.origin.cost
    let destcost = Math.max(dest.reduce((a, i) => a + (+i.call_duration), 0) - k.dest.treshold, 0) * k.dest.cost
    let smscost = Math.max(origin.reduce((a, i) => a + (+i.sms_number), 0) - k.sms.treshold, 0) * k.sms.cost
    resolve(origincost + destcost + smscost)
  })
}


const exec = child_process.exec;

const IP = "192.168.250.59";
const int_k = { price: 1, treshold: -1000 * (2 ** 10) }

function opendata() {
  fs.readFile('./internet.txt', async (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    calculate_internet(await csv(prepare(data))).then(price => {
      texts.links.push({ index: texts.links.length + 1, name: "Интернет", cost: price })
      texts.sum -=- price
      texts.nds = +(texts.sum * 0.2).toFixed(2)
      texts.sum = +texts.sum.toFixed(2)
      console.log(texts)
      createpdf()
    })
  })
}

function prepare(data) {
  let prepared = data.toString().replace(/->/g, "").split("\n").map(a => a.replace(/ /, "_")).join("\n").replace(/ {1,}/g, ",").replace(/_/g, " ")
  prepared = "Date_first_seen,Duration,Proto,Src_IP_Addr:Port,Dst_IP_Addr:Port,Flags,Tos,Packets,Bytes,pps,bps,Bpp_Flows\n" + prepared
  fs.writeFile('./internet.csv', prepared, () => { })
  return prepared
}

function calculate_internet(data) {
  return new Promise((resolve) => {
    let user = data.filter(a => a["Src_IP_Addr:Port"].replace(/:.*/g, "") == IP || a["Dst_IP_Addr:Port"].replace(/:.*/g, "") == NUMBER)
    let ammount = Math.ceil(Math.max(0, user.reduce((a, i) => a + (+i.Bytes), int_k.treshold)) / (2 ** 10) * int_k.price * 100) / 100
    resolve(ammount)
  })
}


if (os.type() === 'Linux')
  exec("npm run linux", opendata);
else if (os.type() === 'Windows_NT')
  exec("npm run wsl", opendata);
else
  throw new Error("Unsupported OS found: " + os.type());


fs.readFile('./mobile.csv', async (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  calculate_mobile(await csv(data)).then(price => {
    texts.links.push({ index: texts.links.length + 1, name: "Мобильная связь", cost: price })
    texts.sum -=- price.toFixed(2)
  })
})

const __dirname = path.resolve();

const renderer = ECT({ root: __dirname, ext: '.ect' })

function createpdf() {
  renderer.render('page', texts, function (_, html) {
    pdf.create(html, { format: "a4", border: "1cm", phantomArgs: ['--web-security=no', '--local-url-access=false'] }).toFile("a4.pdf", function (err, res) {
      if (err) return console.log(err);
      console.log("Платежный документ сформирован в a4.pdf")
      open("a4.pdf")
    })
  })
}