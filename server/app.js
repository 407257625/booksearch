const Koa = require('koa')
const koaBody = require('koa-body');
const Router = require('koa-router')
const joi = require('joi')
const validate = require('koa-joi-validate')
const search = require('./search')
const app = new Koa()
const router = new Router()
const fs = require('fs');
const bookpath = "/usr/src/app/books" //上传文档存放路径

// 文件上传
app.use(koaBody({
  multipart: true,
  formidable: {
      maxFileSize: 200*1024*1024	// 设置上传文件大小最大限制，默认2M
  }
}));

// Log each request to the console
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}`)
})

// Log percolated errors to the console
app.on('error', err => {
  console.error('Server Error', err)
})

// Set permissive CORS header
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  return next()
})

/**
 * GET /search
 * Search for a term in the library
 * Query Params -
 * term: string under 60 characters
 * offset: positive integer
 */
router.get('/search',
  validate({
    query: {
      term: joi.string().max(60).required(),
      offset: joi.number().integer().min(0).default(0)
    }
  }),
  async (ctx, next) => {
    const { term, offset } = ctx.request.query
    aaa = await search.queryTerm(term, offset)
    ctx.body = aaa
  }
)

/** Post /upload
 * 文件上传
 */
router.post('/upload', 
  async (ctx) => {
    var files = ctx.request.files.file;	// 获取上传文件
    if (!(files instanceof Array)) {
      files = new Array(files)
    }
    for (let file of files) {
      // 获取上传文件扩展名
      const ext = file.name.split('.').pop();
      if (["docx", "doc", "txt", "pdf"].indexOf(ext) < 0) {
        return ctx.body = JSON.stringify({"result":"error","message": "后缀名[" + ext + "]不支持"});
      }
      // 创建可读流
      const reader = fs.createReadStream(file.path);
      // 创建可写流
      //const upStream = fs.createWriteStream(`upload/${Math.random().toString()}.${ext}`);
      const upStream = fs.createWriteStream(`${bookpath}/${file.name}`);
      // 可读流通过管道写入可写流
      reader.pipe(upStream);
    }

    return ctx.body = JSON.stringify({"result":"success","message": "上传成功"});
})

/**
 * GET /paragraphs
 * Get a range of paragraphs from the specified book
 * Query Params -
 * bookTitle: string under 256 characters
 * start: positive integer
 * end: positive integer greater than start
 */
router.get('/paragraphs',
  validate({
    query: {
      bookTitle: joi.string().max(256).required(),
      start: joi.number().integer().min(0).default(0),
      end: joi.number().integer().greater(joi.ref('start')).default(10)
    }
  }),
  async (ctx, next) => {
    const { bookTitle, start, end } = ctx.request.query
    ctx.body = await search.getParagraphs(bookTitle, start, end)
  }
)

const port = process.env.PORT || 3000

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(port, err => {
    if (err) console.error(err)
    console.log(`App Listening on Port ${port}`)
  })
