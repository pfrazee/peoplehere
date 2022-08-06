import fetch from 'node-fetch'
import cheerio from 'cheerio'
import moment from 'moment'
import { exec } from 'child_process'
import { promisify } from 'util'
const execp = promisify(exec)

const FIFTEEN_MIN = moment().subtract(15, 'minutes')
const HIGHBROW_ENDPOINT = 'http://192.168.1.254/cgi-bin/devices.ha'

const skip_mac_prefixes = [
  // iot devices
  '6c:29:90',
  'a8:bb:50:',
  // not sure but probably not a person
  'ff:ff:ff:ff:ff:ff',
  // Hon Hai Precision Ind. Co
  '70:77:81',
  // nest
  '64:16:66',
  '1c:53:f9',
  // amazon
  '90:A8:22',
  'EC:0D:E4',
  'ec:d:e4',
  '18:B4:30',
  '10:ce:02',
  '10:ce:2',
  'DC:54:D7',
  // nokia (?)
  'DC:8D:8A',
  // sonos
  '78:28:CA',
  '0:e:58',
  '00:0e:58',
  '94:9f:3e',
  'b8:e9:37',
  '5c:aa:fd',
  'd8:eb:46',
  '20:1f:3b',
  '14:c1:4e',

  // controversial choices from here
  // I believe that mobile phones use randomized mac addresses
  // so if a lookup returns anything, I'm assuming it's not a phone
  // apple
  'c8:d0:83',
  '38:f9:d3', // (pretty sure this is mac laptops only, so skip)
  // google
  '44:BB:3B',
  '28:BD:89',
  'B0:E4:D5',
].map((v) => v.toLowerCase())

async function countHighbrowDevices() {
  // highbrow is the main router's wifi
  // it helpfully enumerates the devices on a status page
  console.log('fetching highbrow devices...')
  const html = await (await fetch(HIGHBROW_ENDPOINT)).text()
  const $ = cheerio.load(html)

  let rows = []
  let current = {}
  $('table tr').each((i, row) => {
    const key = $('th', row).html()
    const value = $('td', row).html()
    if (!key) {
      rows.push(current)
      current = {}
    } else {
      current[key.trim()] = (value || '').trim()
    }
  })

  const active = rows.filter((row) => {
    const date = new Date(row['Last Activity'])
    const mac = row['MAC Address'].toLowerCase()
    for (const skipprefix of skip_mac_prefixes) {
      if (mac.startsWith(skipprefix)) {
        return false
      }
    }
    return date && date > FIFTEEN_MIN && skip_mac_prefixes
  })
  console.log('Found', active.length, 'devices on highbrow')
  // console.log(JSON.stringify(active, null, 2))
  return active.length
}

async function portscan() {
  // we do this to hydrate the arp results
  console.log('port scanning to hydrate arp table...')
  await execp("nmap -sn '192.168.86.*'")
}

async function countLowbrowDevices() {
  // lowbrow is the mesh wifi
  // we count the entries in the arp output
  // await portscan()
  console.log('running arp...')
  const res = (await execp('arp -a')).stdout
  const macs = new Set()
  res.split('\n').forEach(function (line) {
    if (!line.includes('(192.168.') || line.includes('incomplete')) {
      return
    }
    const mac = /at\s([\S]+)\s/.exec(line)[1]
    for (const skipprefix of skip_mac_prefixes) {
      if (mac.startsWith(skipprefix)) {
        return
      }
    }
    console.log('extract', line)
    macs.add(mac)
  })
  console.log('Found', macs.size, 'devices on highbrow')
  // console.log(macs)
  return macs.size
}

async function sendResults(num) {
  console.log('uploading results')
  fetch(process.env.ENDPOINT + `?num=${num}`, { method: 'POST' }).then(
    (res) => {
      console.log('succeeded', new Date())
    },
    (err) => {
      console.log('failed', new Date())
      console.error(err)
    }
  )
}

async function main() {
  let count = 0
  try {
    count += await countHighbrowDevices()
  } catch (e) {
    console.error('Errored querying highbrow devices')
    console.error(e)
  }
  try {
    count += await countLowbrowDevices()
  } catch (e) {
    console.error('Errored querying lowbrow devices')
    console.error(e)
  }
  console.log(count, 'devices total')
  await sendResults(count)
}
main()
setInterval(main, 1e3 * 60 * 10)
