const request = require('request')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const fs = require('fs')
const { dbo, mongoose } = require('./db.js')

// 多个信息
let host = 'http://www.gzgafk.com'
let hash = '/show/7--------1---.html'
// 一个信息(用来测试)
// let host = 'http://www.gzgafk.com'
// let hash = '/dy/kehuan/188626/'
let url = host + hash
let count = 0
let count2 = 0

// 10秒内没有进行第一个请求就关闭数据库连接
// 请求完后关闭在getMovies里设置
let clear = setTimeout(() => {
    mongoose.disconnect()
},10000)

// 一个(1)
// getMovies(url)
// 一页(36)
// getList(url)
// 所有页(2000)
getAll(url)

// 封装请求
function myrequest (url) {
    return new Promise((resolve, reject) => {
        request(url, function (err, res, body) {
            if (res.statusCode == 200) { resolve(body) } else { reject(err) }
        })
    })
}

// 获取一个信息（一个）(会获取电影详情页的信息)
async function getMovies (url) {
    const html = await myrequest(url)
    const $ = cheerio.load(html)
    // 网页上的空格是&nbsp 用js转换是String.fromCharCode(160)  (因为打不出&nbsp，所以用api转换出来，编码是160)
    let data = $('.stui-content__detail > p:nth-child(2)').text().replace('类型：', '').replace('地区：', '|').replace('年份：', '|').split('|')
    // 浏览器调试框，右键dom -> copy -> copy selector 可以快速的到dom元素
    let movie = {
        title: $('.stui-content__detail > h1').text(),
        // url: host + $('.stui-content__detail > div > a').attr('href'),
        url: [],
        pic: $('.stui-content__thumb > a > img').attr('data-original'),
        detail: $('#desc > div > div.stui-pannel_bd > div > p').text(),
        // 网页上的空格是&nbsp 用js转换是String.fromCharCode(160)  (因为打不出&nbsp，所以用api转换出来，编码是160)
        region: data[1].trim().split(String.fromCharCode(160)),
        year: data[2].trim(),
        labels: data[0].trim().split(String.fromCharCode(160)),
        director: $('.stui-content__detail > p:nth-child(4) > a').text(),
        lead: [],
        score: $('.stui-content__thumb > span').text().replace('分', ''),
        time: $('.stui-content__detail > p.data.hidden-sm').text().replace('更新：', '')
    }
    $('.stui-content__detail > p:nth-child(3) > a').each((i, item) => {
        movie.lead.push($(item).text())
    })
    $('.stui-pannel-box .stui-pannel_hd > div > ul.nav.nav-tabs > li a').each((i, item) => {
        let data = {
            source: $(item).text(),
            url: []
        }
        $('.stui-panel_bd ' + $(item).attr('href') + ' li a').each((i, item) => {
            let url = {
                title: $(item).text(),
                url: host + $(item).attr('href')
            }
            data.url.push(url)
        })
        movie.url.push(data)
    })
    // 保存到本地文件(也可以保持到数据库)
    // fs.appendFile('./public/index.js', JSON.stringify(movie), function (err){})
    // 保存到数据库
    // saveDB(movie)
    let isExistence = await dbo.find({title: movie.title}).count()
    count++
    if (!isExistence) {
        // saveDB(movie)
        console.log(movie)
    } else {
        console.log(movie.title+'已存在');
        count2++
    }
    console.log('第', count, '条');
    console.log('已存在', count2, '条');
    // 5秒不执行获取信息就关闭数据库的连接
    clearTimeout(clear)
    clear = setTimeout(() => {
        mongoose.disconnect()
    }, 5000)
}

// 获取单页面（一页）
async function getList (url) {
    const html = await myrequest(url)
    const $ = cheerio.load(html)
    $('.stui-vodlist__thumb').each((i, item) => {
        getMovies(host + $(item).attr('href'))
    })
}

// 直接写在for里的话数量太多了，高并发，电脑受不了
// 优化，一个getList执行完后再执行resolve()，再继续执行getList
// 封装成方法，获取所有的页
function getAll (url, num=62) {
    // 爬取大量的(一个类里所有的页)
    let arr = []
    for (let i = 1;i <= num;i++) {
        // 找到共同点，将页数改了
        arr.push(`${host}/show/7--------${i}---.html`)
    }
    arr.reduce((rs, url) => {
        return rs.then(() => {
            return new Promise(async (resolve) => {
                await getList(url)
                resolve()
            })
        })
    }, Promise.resolve())
}

function saveDB(movie) {
    // 保存到数据库
    // let res = new dbo({
    //     name: movie.name,
    //     url: movie.url,
    //     pic: movie.pic,
    //     detail: movie.detail
    // })
    // 优化，用扩展运算符
    // let res = new dbo({ ...movie })
    // 可以直接写对象?
    let res = new dbo(movie)
    res.save(err => {
        if (err) throw err
    })
}

