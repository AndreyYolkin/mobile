import csv from "neat-csv"
import fs from "fs"

import os from "os"
import child_process from "child_process"

import Chart from "chartjs-node-canvas"

const myChart = new Chart.CanvasRenderService(800, 400);
let configuration = {
  type: 'line',
  backgroundColor: 'rgba(255, 255, 255, 1)',
  data: {
    labels: [],
    datasets: [{
      label: "bytes/time",
      data: [],
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255,99,132,1)',
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'hour'
        }
      }]
    }
  }
}

const exec = child_process.exec;

const NUMBER = "192.168.250.59";
const k = { price: 1, treshold: -1000 * (2 ** 10) }

function opendata() {
  fs.readFile('./data.txt', async (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    calculate(await csv(prepare(data))).then(price => {
      fs.writeFile('./output.csv', `user,sum\n${NUMBER},${price}`, () => { })
    })
  })
}

function prepare(data) {
  let prepared = data.toString().replace(/->/g, "").split("\n").map(a => a.replace(/ /, "_")).join("\n").replace(/ {1,}/g, ",").replace(/_/g, " ")
  prepared = "Date_first_seen,Duration,Proto,Src_IP_Addr:Port,Dst_IP_Addr:Port,Flags,Tos,Packets,Bytes,pps,bps,Bpp_Flows\n" + prepared
  fs.writeFile('./data.csv', prepared, () => { })
  return prepared
}

function calculate(data) {
  return new Promise((resolve) => {
    configuration.data.labels = data.map(a => new Date(a.Date_first_seen)).sort((a, b) => b - a)
    let last_data = 0
    configuration.data.datasets[0].data = data.map((a, i) => { last_data += (+a.Bytes); return last_data }).sort((a, b) => b - a)
    myChart.renderToBuffer(configuration).then(data => fs.writeFile("graph.png", data, () => { }));

    let user = data.filter(a => a["Src_IP_Addr:Port"].replace(/:.*/g, "") == NUMBER || a["Dst_IP_Addr:Port"].replace(/:.*/g, "") == NUMBER)
    let ammount = Math.ceil(Math.max(0, user.reduce((a, i) => a + (+i.Bytes), k.treshold)) / (2 ** 10) * k.price * 100) / 100
    resolve(ammount)
  })
}


if (os.type() === 'Linux')
  exec("npm run linux", opendata);
else if (os.type() === 'Windows_NT')
  exec("npm run wsl", opendata);
else
  throw new Error("Unsupported OS found: " + os.type());
