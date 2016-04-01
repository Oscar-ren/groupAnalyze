var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var request = require('request');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');

app.use(logger('dev'));
app.use(express.static('./'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

http.listen(3100, function(){
    console.log('Node.js running at: http://0.0.0.0:3100');
});

app.get('/history', function(req, res) {

    res.render('./history.html');
});

app.get('/year', function(req, res) {

    request('http://222.198.126.241/pad/api/course/teacher/-1/list/years', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //body arrayString
            var yearSet = {};
            var result = JSON.parse(body);

            if(result && result instanceof Array) {
                for(var i = 0, len = result.length; i < len; i ++) {
                    yearSet[result[i]] = result[i];
                }
            }

            res.send({result: yearSet});

        }
    });

});

app.post('/courses', function(req, res) {

    //得到课程列表
    request('http://222.198.126.241/pad/api/course/teacher/-1/list/by/year/' + req.body.year, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send({result: JSON.parse(body)});

        }
    });

});

app.post('/missions', function(req, res) {

    //得到课程列表
    request('http://222.198.126.241/pad/api/course/' + req.body.course + '/mission/list', function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var originData = JSON.parse(body);

            var data = originData.map(function(value, index) {

                var obj = {};
                obj.id = value.id;
                obj.name = value.name;
                return obj;
            });

            res.send({result: data});
        }
    });

});

//得到每个组该作业的相关信息并处理后返回前端
app.post('/pads', function(req, res) {


    //得到该作业不同小组的padID
    request('http://222.198.126.241/pad/api/mission/' + req.body.mission + '/pad/list', function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var originData = JSON.parse(body);

            //得到文章id
            var data = [];

            originData.forEach(function(value, index) {

                data.push(value['pad_id']);
            });

            res.send({padSet: data});

        }
    });

});

app.post('/outputCsv', function(req, res) {

    var buffer = new Buffer(req.body.chat);
    var iconv = require('iconv-lite');
    var str=iconv.encode(buffer,'gb2312');

    fs.writeFile('./csv/' + req.body.name + '.csv', str, function(err) {
        if(err) throw err;
        console.log('is saved');
        res.send('success');
    })

});

app.post('/groupCsv', function(req, res) {

    var buffer = new Buffer(req.body.chat);
    var iconv = require('iconv-lite');
    var str=iconv.encode(buffer,'gb2312');

    fs.writeFile('./csv/' + req.body.name + '.csv', str, function(err) {
        if(err) throw err;
        res.send('success');
    })

});


