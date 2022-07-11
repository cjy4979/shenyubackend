//导入 express 模块
//session的签发有问题，但来不及调试了
const express = require('express')
const cors = require('cors')
const mysql = require('mysql')
var moment = require('moment');
moment.locale('zh-cn');


const db = mysql.createPool({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'admin123',
    database: 'my_ab_01'
})

//创建 express 实例
const app = express()

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({
    extended: false
}))

//配置session
const session = require('express-session')
const {
    JSON,
    NULL
} = require('mysql/lib/protocol/constants/types')
app.use(session({
    secret: 'itheima',
    resave: false,
    saveUninitialized: true,
}))


//登录api
app.post('/api/login', (req, res) => {
    var sql = "SELECT * FROM users  WHERE username = ?"
    db.query(sql, req.body.username, function (err, result) {
        if(err){
            return res.send({
                status: 1,
                msg: '登陆失败'
            })
        }else if (result.length !== 0 && result[0].password === req.body.password) {
            //登录成功，保存到session
            req.session.user = req.body
            req.session.islogin = true
            res.send({
                status: 0,
                msg: 'success',
                data: result[0].rights
            })

        } else {
            res.send({
                status: 1,
                msg: '登陆失败'
            })
        }
    })
})

//验证登录
app.get('/api/username', (req, res) => {
    if (!req.session.islogin) {
        return res.send({
            status: 1,
            msg: 'fail'
        })
    }
    res.send({
        status: 0,
        msg: 'success',
        username: req.session.user.username
    })
})

//登出
app.get('/api/logout', (req, res) => {
    req.session.destroy()
    res.send({
        status: 0,
        msg: 'logout success'
    })
})

//注册
app.post('/api/register', (req, res) => {
    const addSql1 = 'insert into username set ?'
    data = req.body
    console.log(data);
    db.query(addSql1, data, function (err, result) {
        if (err) {
            console.log('[INSERT ERROR] - ', err.message);
            res.send({
                status: 1,
                msg: '失败，请重试'
            })
            return;
        }

        res.send({
            status: 0,
            msg: 'success',
            data: {
                username: data.username,
                password: data.password
            }
        })
        console.log('--------------------------INSERT----------------------------');
        //console.log('INSERT ID:',result.insertId);        
        console.log('INSERT ID:', result);
        console.log('-----------------------------------------------------------------\n\n');
    });
})

//获取比赛安排信息
app.get('/api/schedule', (req, res) => {
    var sql = "SELECT * FROM arrangement  WHERE type = '" + req.query.type + "' LIMIT " + (req.query.page - 1) * req.query.size + "," + req.query.size
    //查
    var total
    db.query("SELECT COUNT(*) FROM arrangement  WHERE type ='" + req.query.type + "'", function (err, result) {
        total = result
        db.query(sql, function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send({
                    status: 1,
                    msg: 'failed',
                    data: []
                })
                return;
            }
            res.send({
                status: 0,
                msg: 'success',
                data: result,
                total: total[0]
            })
        });
    })

})

//添加赛事
app.get('/api/addlist', (req, res) => {
    const data1 = {
        type: req.query.type,
        schedule: req.query.type,
    }
    const addSql1 = 'insert into arrangement set ?'
    db.query(addSql1, data1, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send({
                status: 1,
                msg: 'failed',
                data: err.sqlMessage
            })
            return;
        } else {
            var sql = 'SELECT * FROM arrangement  WHERE type = ?';
            //查
            db.query(sql, req.query.type, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                res.send({
                    status: 0,
                    msg: 'success',
                    data: result
                })
            });
        }

    });
})


//比赛信息更改
app.post('/api/changeschedule', (req, res) => {
    var data = req.body
    var modSql = 'UPDATE arrangement SET  ? WHERE id = ?';
    db.query(modSql, [data, data.id], function (err, result) {
        if (err) {
            console.log('[UPDATE ERROR] - ', err.message);
            res.send({
                status: 1,
                msg: 'failed',
                data: err.sqlMessage
            })
            return;
        } else {
            var sql = 'SELECT * FROM arrangement WHERE id = ?';
            //查
            db.query(sql, data.id, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                res.send({
                    status: 0,
                    msg: 'success',
                    data: result
                })
            });
        }
    })
})

//删除赛事列表
app.get('/api/deletelist', (req, res) => {
    const query = req.query
    var delSql = 'DELETE FROM arrangement where id=?';
    //删
    db.query(delSql, query.id, function (err, result) {
        if (err) {
            console.log('[DELETE ERROR] - ', err.message);
            res.send({
                status: 1,
                msg: 'failed',
                data: '删除失败'
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: '成功'
        })
    });
})


//比赛信息管理

//添加队伍
app.post('/api/addteam', (req, res) => {
    //先比对库中是否存在该队伍
    var sql = 'SELECT 1 FROM teams where team = ? limit 1';
    db.query(sql, req.body.team, function (err, result) {
        if (result[0] === undefined) {
            //队伍不存在，加入数据
            const addSql1 = 'insert into teams set ?'
            var data = req.body
            delete data['status']
            db.query(addSql1, data, function (err, result) {
                if (err) {
                    res.send({
                        status: 1,
                        msg: 'failed',
                        data: err.message
                    })
                    return;
                }
                //返回
                res.send({
                    status: 0,
                    msg: '成功添加队伍信息',
                    data: req.body.team
                })
            });
            return;
        } else {
            //队伍存在，更新数据
            // res.send({
            //     status: 1,
            //     msg: 'failed',
            //     data: '更新失败'
            // })
            const updatesql = 'UPDATE teams SET ? WHERE team = ?'
            db.query(updatesql, [req.body, req.body.team], function (err, result) {
                if (err) {
                    res.send({
                        status: 1,
                        msg: 'failed',
                        data: '更新失败'
                    })
                } else {
                    res.send({
                        status: 0,
                        msg: '队伍已经存在，数据更新成功',
                        data: req.body.team
                    })
                }
            })
        }
    });

})



//获取队伍信息
app.get('/api/getteamlist', (req, res) => {
    var sql = 'SELECT team,type FROM teams WHERE selected = ? ORDER BY type ASC';

    //查
    db.query(sql, req.query.selected, function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result
        })
    });
})

//获取指定队伍信息
app.get('/api/getlistbyteam', (req, res) => {
    var sql = 'SELECT * FROM teams where team = ?';
    //查
    db.query(sql, req.query.team, function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result
        })
    });
})

//筛选情况
app.get('/api/teamselect', (req, res) => {
    var sql = 'UPDATE teams SET ? WHERE team = ?';
    var data = {
        selected: req.query.selected
    }
    db.query(sql, [data, req.query.team], function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result
        })
    });
})

//队伍编号
app.get('/api/teamcode', (req, res) => {
        var code = {
            type: req.query.type
        }
        //先查是否存在
        db.query('SELECT 1 FROM teams where type = ? limit 1', req.query.type, function (err, result) {
            if (result[0] === undefined) {
                db.query('UPDATE teams SET ? WHERE team = ?', [code, req.query.team], function (err, result) {
                    if (err) {
                        res.send({
                            status: 1,
                            msg: 'failed',
                            data: err.message
                        })
                        return;
                    }
                    res.send({
                        status: 0,
                        msg: 'success',
                        data: result
                    })
                })
            } else {
                res.send({
                    status: 0,
                    msg: '1',
                    data: '编号已被使用，是否强制更新？'
                })
            }
        })

    }

)
//编号已被使用，但强制更新
app.get('/api/teamcodeforce', (req, res) => {
        var code = {
            type: req.query.type
        }
        var team = req.query.team
        //先占用编号的队伍名称
        db.query('SELECT team FROM teams where type = ? limit 1', req.query.type, function (err, result) {
            var oldTeam = result[0].team
            if (err) {
                console.log(err);
                res.send({
                    status: 1,
                    msg: 'failed',
                    data: '失败'
                })
                return
            } else {

                //更改占用编号的队伍为''
                db.query("UPDATE teams SET ? WHERE team = '" + oldTeam + "'", {
                    type: ''
                }, function (err, result) {
                    if (err) {
                        res.send({
                            status: 1,
                            msg: 'failed',
                            data: '失败'
                        })
                        return;
                    }
                });
            }
            //同时更新新队伍编号
            db.query('UPDATE teams SET ? WHERE team = ?', [code, req.query.team], function (err, result) {
                if (err) {
                    res.send({
                        status: 1,
                        msg: 'failed',
                        data: err.message
                    })
                    return;
                }
                res.send({
                    status: 0,
                    msg: 'success',
                    data: result
                })
            })
        })

    }

)

//删除队伍
app.get('/api/deleteteam', (req, res) => {
    const query = req.query
    var delSql = 'DELETE FROM teams where team=?';
    //删
    db.query(delSql, query.team, function (err, result) {
        if (err) {
            console.log('[DELETE ERROR] - ', err.message);
            res.send({
                status: 1,
                msg: 'failed',
                data: '删除失败'
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: '成功'
        })
    });
})


//提交比赛信息
//如果你看到这行代码，说明我没来得及对逻辑进行优化
app.get('/api/submit', (req, res) => {
    var now = moment().locale('zh-cn').format('YYYY-MM-DD HH:mm:ss'); //到达服务器的时间
    var ago = moment()
    var anHourAgo = ago.subtract(2, 'hours').format('YYYY-MM-DD HH:mm:ss'); //前两小时的时间
    //比赛开始后两小时内应当提交赛果，否则无法智能匹配
    var sql = "SELECT * FROM arrangement WHERE judge1='" + req.query.name + "' AND time  BETWEEN '" + anHourAgo + "' and '" + now + "'"
    //查
    db.query(sql, function (err, result) {
        //即将开启套娃
        //三层if嵌套
        //查询评委1出错
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }

        if (result[0] === undefined) {
            //评委1不匹配，继续比对评委2
            var sql = "SELECT * FROM arrangement WHERE judge2='" + req.query.name + "' AND time  BETWEEN '" + anHourAgo + "' and '" + now + "'"
            db.query(sql, function (err, result) {
                if (err) {
                    res.send({
                        status: 1,
                        msg: 'failed',
                        data: err.message
                    })
                    return;
                }
                if (result[0] === undefined) {
                    //评委2不匹配，继续比对评委3
                    var sql = "SELECT * FROM arrangement WHERE judge3='" + req.query.name + "' AND time  BETWEEN '" + anHourAgo + "' and '" + now + "'"
                    db.query(sql, function (err, result) {
                        if (err) {
                            res.send({
                                status: 1,
                                msg: 'failed',
                                data: err.message
                            })
                            return;
                        }
                        if (result[0] === undefined) {
                            //还不对，报警吧
                            res.send({
                                status: 1,
                                msg: 'failed',
                                data: '未查询到您的评赛信息，请联系工作人员'
                            })
                            return;
                        } else {
                            //是评委3，上传比赛数据
                            var data = {
                                judge3win: req.query.win,
                                judge3best: req.query.best
                            }
                            var addSqlData = 'UPDATE arrangement SET ? WHERE id = ?'
                            db.query(addSqlData, [data, result[0].id], function (err, result) {
                                if (err) {
                                    res.send({
                                        status: 1,
                                        msg: 'failed',
                                        data: err.message
                                    })
                                    return;
                                }
                                res.send({
                                    status: 0,
                                    msg: 'success',
                                    data: result
                                })
                            })
                        }
                    })
                } else {
                    //是评委2，上传比赛数据
                    var data = {
                        judge2win: req.query.win,
                        judge2best: req.query.best
                    }
                    var addSqlData = 'UPDATE arrangement SET ? WHERE id = ?'
                    db.query(addSqlData, [data, result[0].id], function (err, result) {
                        if (err) {
                            res.send({
                                status: 1,
                                msg: 'failed',
                                data: err.message
                            })
                            return;
                        }
                        res.send({
                            status: 0,
                            msg: 'success',
                            data: result
                        })
                    })
                }
            })
        } else {
            //是评委1，上传比赛数据
            var data = {
                judge1win: req.query.win,
                judge1best: req.query.best
            }
            var addSqlData = 'UPDATE arrangement SET ? WHERE id = ?'
            db.query(addSqlData, [data, result[0].id], function (err, result) {
                if (err) {
                    res.send({
                        status: 1,
                        msg: 'failed',
                        data: err.message
                    })
                    return;
                }
                res.send({
                    status: 0,
                    msg: 'success',
                    data: result
                })
            })
        }
    });
    return;
})


//查赛果
app.get('/api/statistics', (req, res) => {
    var sql = 'SELECT * FROM arrangement  WHERE type = ?';
    //查
    db.query(sql, req.query.type, function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result
        })
    });
})

//赛果提交备用库
app.get('/api/backsubmit', (req, res) => {
    console.log('0000');
    var time = moment().locale('zh-cn').format('YYYY-MM-DD HH:mm:ss');
    var data = {
        time: time,
        name: req.query.name,
        win: req.query.win,
        best: req.query.best
    }
    var sql = 'insert into vote set ?'
    db.query(sql, data, function (err, result) {
        if (err) {
            return res.send({
                status: 1,
                msg: 'failed'
            })
        }
        res.send({
            status: 0,
            msg: 'success'
        })
    })
})

//查备用库
app.get('/api/backdate', (req, res) => {
    var sql = "SELECT * FROM vote LIMIT " + (req.query.page - 1) * req.query.size + "," + req.query.size
    db.query("SELECT COUNT(*) FROM arrangement  WHERE type ='" + req.query.type + "'", function (err, result) {
        total = result
        db.query(sql, function (err, result) {
            if (err) {
                res.send({
                    status: 1,
                    msg: 'failed',
                    data: err.message
                })
                return;
            }
            res.send({
                status: 0,
                msg: 'success',
                data: result,
                total:total[0]['COUNT(*)']
            })
        });
    });
})

//比赛人员信息

//获取比赛列表（分赛段）
app.get('/api/getlistbytype', (req, res) => {
    //var sql = 'SELECT id,schedule FROM arrangement WHRER type = ? ORDER BY schedule ASC'
    //db.query(sql,req.query.type,function(err,result){
    var sql = 'SELECT schedule FROM arrangement  ORDER BY schedule ASC'
    db.query(sql, function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed',
                data: err.message
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result
        })
    })
})

//队员名单，用于赛事列表填写上场人员
app.get('/api/getmember', (req, res) => {
    var sql = 'SELECT member1,member2,member3,member4,member5,member6,member7,member8 FROM teams WHERE team =?'
    db.query(sql, req.query.team, function (err, result) {
        if (err) {
            res.send({
                status: 1,
                msg: 'failed'
            })
            return;
        }
        res.send({
            status: 0,
            msg: 'success',
            data: result[0]
        })
    })
})

//测试完毕，准备比赛，清空测试数据
app.get('/api/getready', (req, res) => {
    //预制了schedule（赛程）和type（赛段），保留
    //为什么重置整表，前端发送请求新建赛程赛段？因为会出现部分显示bug，暂时来不及改了
    const data = {
        z: null,
        f: null,
        topicZ: null,
        topicF: null,
        topic: null,
        time: null,
        endtime: null,
        meeting: null,
        judge1: null,
        judge1win: '',
        judge1best: '',
        judge2: null,
        judge2win: '',
        judge2best: '',
        judge3: null,
        judge3win: '',
        judge3best: '',
        timer: null,
        host: null,
        control: null,
        teamContact: null,
        judgeContact: null,
        z1: null,
        z2: null,
        z3: null,
        f1: null,
        f2: null,
        f3: null,
    }
    var sql_arrangement = "UPDATE arrangement SET ?"
    db.query(sql_arrangement, data, function (err, result) {
        if (err) {
            console.log(err.message);
            return
        }
        res.send({
            status: '0',
            msg: 'success'
        })
    })
})

//重置队伍列表


app.listen('8005', () => {
    console.log('express sever running at http://127.0.0.1');
})