import csv from "neat-csv"
import fs from "fs"

const NUMBER = "915642913";
const k = { origin: { cost: 1, treshold: 0 }, dest: { cost: 1, treshold: 0 }, sms: { cost: 1, treshold: 5 } }

function calculate(data) {
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


fs.readFile('./data.csv', async (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  calculate(await csv(data)).then(price =>  {
    fs.writeFile('./output.csv', `user,sum\n${NUMBER},${price}`, ()=>{})
  })
})
