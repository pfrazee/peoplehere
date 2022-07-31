import http from 'http'

let num = 0
http
  .createServer((req, res) => {
    console.log('request received', req.method)
    if (req.method === 'POST') {
      const urlp = new URL('http://localhost' + req.url)
      console.log('updating to', urlp.searchParams.get('num'))
      num = urlp.searchParams.get('num')
      res.writeHead(200)
      res.end('ok')
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(
        `<style>body{text-align: center; padding: 10vh 20px;}h1{font-size: 20vw;margin: 0;}h3{font-size: 10vw;margin: 0;}</style><h3>There are</h3><h1>${num}</h1><h3>people here</h3>`
      )
    }
  })
  .listen(process.env.PORT)
