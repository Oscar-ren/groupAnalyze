var baseUrl = "http://222.198.126.242:8080/api/1.2.10/";
var	apikey = "8f2f95ba0babc4a151d970b8acfbc00869cf3dce5b5ca6893343303d86049cd8";

//专注度与时间的映射表
var _focus = [
    {p: 100, t: 0.5},
    {p: 95, t: 3},
    {p: 90, t: 6},
    {p: 85, t: 10},
    {p: 80, t: 15},
    {p: 75, t: 21},
    {p: 70, t: 38},
    {p: 65, t: 35},
    {p: 60, t: 42},
    {p: 55, t: 50},
    {p: 50, t: 58},
    {p: 45, t: 66},
    {p: 40, t: 75},
    {p: 35, t: 85},
    {p: 30, t: 96},
    {p: 25, t: 108},
    {p: 20, t: 121},
    {p: 15, t: 135},
    {p: 10, t: 150},
    {p: 5, t: 165},
    {p: 3, t: 180},
    {p: 0, t: 200}
];

//根据时间差算专注度
function getFocusByTemp(t) {
    if(typeof t !== 'number') {
        return;
    }

    if(t >= _focus[_focus.length - 1].t) {
        return 0;
    }

    if(t < _focus[0].t) {
        return 100;
    }

    for(var i = 0; i < _focus.length - 1; i++) {
        if(t >= _focus[i].t && t < _focus[i + 1].t) {
            return _focus[i].p;
            break;
        }
    }
}

//查询每个小组的pad作业信息
function queryVersionsData(padSet, beginTime, finalTime, distance, S1groupSet, S2groupSet) {

    if(padSet.length == 0) {
        return;
    }

    var S1OriginData = [], S2OriginData = [];

    for(var i = 0, padLen = padSet.length; i < padLen; i++) {
        var currentGroupID = padSet[i].split('$')[1].split('-')[1].slice(2);

        if(S1groupSet.indexOf(currentGroupID) > -1 || S2groupSet.indexOf(currentGroupID) > -1) {
            getGroupMissionVersions(padSet[i], beginTime, finalTime, distance, S1groupSet, S2groupSet, S1OriginData, S2OriginData);
        }else {
            continue;
        }

    }


}

//根据作业信息pad算专注度
function getGroupMissionVersions(padID, beginTime, finalTime, distance, S1, S2, S1OriginData, S2OriginData) {

    $.ajax({
        type: 'get',
        url: baseUrl + 'getAllVersions?padID=' + padID + '&apikey=' + apikey,
        dataType: 'jsonp',
        jsonp: 'jsonp'
    }).then(function(result) {

        if(result.code == 0) {

            var beginIndex = 0, finalIndex = 0, groupAuthorCount = 0;

            //获取每个文章作者人数
            $.ajax({
                type: 'get',
                url: baseUrl + 'listAuthorsOfPad?padID=' + padID + '&apikey=' + apikey,
                dataType: 'jsonp',
                jsonp: 'jsonp'
            }).then(function(req) {

                groupAuthorCount = req.data.authorIDs.length;
                var versions = result.data.version;


                //起始时间内的所有版本
                for(var i = 0; i < versions.length; i++) {

                    if(versions[i].timestamp < beginTime) {
                        beginIndex = i;
                    }else if(versions[i].timestamp > finalTime || i == (versions.length - 1) ) {
                        finalIndex = i;
                        break;
                    }

                }
                var timeArea = versions.slice(beginIndex + 1, finalIndex);

                //时间戳 1s = 1000
                // eachData 每个组的数据
                var eachData = {};
                var currentGroupID = padID.split('$')[1].split('-')[1].slice(2);

                eachData.groupID = currentGroupID;
                eachData.groupData = [];


                //取样
                for(var j = 0; ; j++) {

                    if(timeArea.length == 0 || timeArea[timeArea.length -1].timestamp < beginTime + distance*1000*j) {
                        break;
                    }

                    // eachVersions 观察范围内的版本
                    // eachAuthor 观察范围内的参与用户
                    // eachInfo 每个用户和对应的版本信息
                    var eachVersions = [],
                        eachAuthor = [],
                        eachInfo = [];

                    //取得观察时间段内的所有版本
                    for(var i = 0; i < timeArea.length; i++) {
                        if(timeArea[i].timestamp > beginTime + distance*1000*j &&  timeArea[i].timestamp <= beginTime + distance*1000*(j + 1)) {
                            eachVersions.push(timeArea[i]);
                        }else if(timeArea[i].timestamp > beginTime + distance*1000*j) {
                            break;
                        }

                    }

                    //取得观察时间段内参加的用户，并存储每个用户数据
                    for(var i = 0; i < eachVersions.length; i++) {
                        //如果当前用户不存在
                        if(eachAuthor.indexOf(eachVersions[i].author) < 0 && eachVersions[i].author) {
                            eachAuthor.push(eachVersions[i].author);

                            //新建用户信息对象
                            var obj = {};
                            obj.authorName = eachVersions[i].author;
                            obj.versions = [];
                            obj.versions.push(eachVersions[i]);
                            eachInfo.push(obj);
                        }else {
                            //用户存在，添加用户版本信息
                            for(var k = 0; k < eachInfo.length; k++) {
                                if(eachVersions[i].author == eachInfo[k].authorName) {
                                    eachInfo[k].versions.push(eachVersions[i]);
                                }
                            }
                        }
                    }


                    var groupFocus = 0;
                    //根据两个相邻版本时间差算个人专注度，再算小组平均专注度
                    for(var i = 0; i < eachInfo.length; i++) {

                        var currentFocus = 0;
                        var versions = eachInfo[i].versions;

                        for(var k = 0; k < versions.length - 1; k++) {
                            var temp = versions[k + 1].timestamp - versions[k].timestamp;
                            temp = temp / 1000;
                            currentFocus += getFocusByTemp(temp) / 100;
                        }

                        currentFocus = currentFocus/versions.length;
                        groupFocus += currentFocus;
                    }

                    eachData.groupData.push({
                        name: new Date(beginTime + distance*1000*j),
                        value: [
                            new Date(beginTime + distance*1000*j),
                            groupFocus / groupAuthorCount
                        ]
                    });
                }


                if(S1.indexOf(currentGroupID) > -1) {

                    S1OriginData.push(eachData.groupData);

                    //数据收齐了
                    if(S1OriginData.length == S1.length) {

                        var S1CsvData = getChartData(S1OriginData, S1MissionData, true);

                        $.ajax({
                            url: '/groupCsv',
                            data: {
                                name: 'S1数据',
                                chat: S1CsvData
                            },
                            type: 'post'
                        }).then(function(result) {
                            console.log('S1 is success');
                        },function(err) {
                            console.log(err);
                        })
                    }

                }else if(S2.indexOf(currentGroupID) > -1) {
                    S2OriginData.push(eachData.groupData);

                    if(S2OriginData.length == S2.length) {

                        var S2CsvData = getChartData(S2OriginData, S2MissionData, true);

                        $.ajax({
                            url: '/groupCsv',
                            data: {
                                name: 'S2数据',
                                chat: S2CsvData
                            },
                            type: 'post'
                        }).then(function(result) {
                            console.log('S2 is success');
                        },function(err) {
                            console.log(err);
                        })
                    }

                }


                myChart.setOption(option);

            }, function(err) {
                console.log(err);
            });

        }
    }, function(err) {
        console.log(err);
    })

};

//查询聊天历史算专注度
function queryChatHistory(padID, beginTime, finalTime, distance, S1, S2, S1OriginData, S2OriginData) {

    $.ajax({
        type: 'get',
        url: baseUrl + 'getChatHistory?padID=' + padID + '&apikey=' + apikey,
        dataType: 'jsonp',
        jsonp: 'jsonp'
    }).then(function(result) {

        if (result.code == 0) {

            //获取每个文章作者人数
            $.ajax({
                type: 'get',
                url: baseUrl + 'listAuthorsOfPad?padID=' + padID + '&apikey=' + apikey,
                dataType: 'jsonp',
                jsonp: 'jsonp'
            }).then(function(req) {

                var message = result.data.messages, beginIndex = 0, finalIndex = 0;
                var groupAuthorCount = req.data.authorIDs.length;

                //起始时间内的所有版本
                for (var i = 0; i < message.length; i++) {

                    if (message[i].time < beginTime) {
                        beginIndex = i;
                    } else if (message[i].time > finalTime || i == (message.length - 1)) {
                        finalIndex = i;
                        break;
                    }

                }
                var messageArea = message.slice(beginIndex + 1, finalIndex);

                //收集小组聊天信息
                showChatInfo(padID, messageArea, groupAuthorCount);


                //时间戳 1s = 1000
                // eachData 每个组的数据
                var eachData = {};
                var currentGroupID = padID.split('$')[1].split('-')[1].slice(2);

                eachData.groupID = currentGroupID;
                eachData.groupData = [];


                //取样
                for(var j = 0; ; j++) {

                    if(messageArea.length == 0 || messageArea[messageArea.length -1].time < beginTime + distance*1000*j) {
                        break;
                    }

                    // eachVersions 观察范围内的版本
                    // eachAuthor 观察范围内的参与用户
                    // eachInfo 每个用户和对应的版本信息
                    var eachVersions = [],
                        eachAuthor = [],
                        eachInfo = [];

                    //取得观察时间段内的所有版本
                    for(var i = 0; i < messageArea.length; i++) {
                        if(messageArea[i].time > beginTime + distance*1000*j &&  messageArea[i].time <= beginTime + distance*1000*(j + 1)) {
                            eachVersions.push(messageArea[i]);
                        }else if(messageArea[i].time > beginTime + distance*1000*j) {
                            break;
                        }

                    }

                    //取得观察时间段内参加的用户，并存储每个用户数据
                    //for(var i = 0; i < eachVersions.length; i++) {
                    //    //如果当前用户不存在
                    //    if(eachAuthor.indexOf(eachVersions[i].userName) < 0 && eachVersions[i].userName) {
                    //        eachAuthor.push(eachVersions[i].userName);
                    //
                    //        //新建用户信息对象
                    //        var obj = {};
                    //        obj.authorName = eachVersions[i].userName;
                    //        obj.versions = [];
                    //        obj.versions.push(eachVersions[i]);
                    //        eachInfo.push(obj);
                    //    }else {
                    //        //用户存在，添加用户版本信息
                    //        for(var k = 0; k < eachInfo.length; k++) {
                    //            if(eachVersions[i].userName == eachInfo[k].authorName) {
                    //                eachInfo[k].versions.push(eachVersions[i]);
                    //            }
                    //        }
                    //    }
                    //}
                    //
                    //var groupFocus = 0;
                    //根据两个相邻版本时间差算个人专注度，再算小组平均专注度
//                        for(var i = 0; i < eachInfo.length; i++) {
//
//                            var currentFocus = 0;
//                            var versions = eachInfo[i].versions;
//
//                            for(var k = 0; k < versions.length - 1; k++) {
//                                var temp = versions[k + 1].time - versions[k].time;
//                                temp = temp / 1000;
//                                currentFocus += getFocusByTemp(temp) / 100;
//                            }
//
//                            currentFocus = currentFocus/versions.length;
//                            groupFocus += currentFocus;
//                        }

//                        console.log(eachInfo.length);

                    eachData.groupData.push({
                        name: new Date(beginTime + distance*1000*j),
                        value: [
                            new Date(beginTime + distance*1000*j),
                            eachVersions.length
                        ]
                    });

                }


                if(S1.indexOf(currentGroupID) > -1) {

                    S1OriginData.push(eachData.groupData);

                    //数据收齐了
                    if(S1OriginData.length == S1.length) {

                        getChartData(S1OriginData, S1ChatData, false);
                    }

                }else if(S2.indexOf(currentGroupID) > -1) {
                    S2OriginData.push(eachData.groupData);

                    if(S2OriginData.length == S2.length) {

                        var S2CsvData = getChartData(S2OriginData, S2ChatData, false);

                        $.ajax({
                            url: '/groupCsv',
                            data: {
                                name: 'S2聊天数据',
                                chat: S2CsvData
                            },
                            type: 'post'
                        }).then(function(result) {
                            console.log('S2 is success');
                        },function(err) {
                            console.log(err);
                        })
                    }

                }

                showChatFocus.setOption(chatOption);
            }, function(err) {
                console.log(err);
            });

        }else {
            console.log(result.message);
        }

    }, function(err) {
        console.log('查询' + padID + '历史失败');
        console.log(err);
    });

}

//小组聊天信息渲染
function showChatInfo(padID, messageArea, groupAuthorCount) {

    var chatWords = 0, chatAuthor = [];
    var groupName = padID.split('$')[1].split('-')[1];
    var historyGroups = historyData.groupData;

    for (var j = 0; j < messageArea.length; j++) {
        //聊天总字数
        chatWords += messageArea[j].text.length;

        //聊天总人数
        if(chatAuthor.indexOf(messageArea[j].userId) < 0 && messageArea[j].userId) {
            chatAuthor.push(messageArea[j].userId);
        }
    }

    for (var i = 0; i < historyGroups.length; i++) {
        if (groupName == historyGroups[i].name) {
            historyGroups[i].groupAuthorCount = groupAuthorCount;
            historyGroups[i].chatNum = messageArea.length;
            historyGroups[i].chatPeople = chatAuthor.length;
            historyGroups[i].chatWords = chatWords;
        }
    }

    readyQuest.push(padID);

    //数据收齐渲染模板
    if(readyQuest.length == padSet.length) {

        var historyTemplate = Handlebars.compile($('#historyInfo').html());
        $('#history').html(historyTemplate(historyData));
    }

}

function getChartData(OriginData, targetData, isAverage) {

    var longestInfo = getLongestArrayInfo(OriginData);
    var dataSets = {
        fields: ["时间", "专注度"],
        data: []
    };


    // 一共maxlen个数据
    for(var i = 0; i < longestInfo.maxLen; i++) {

        var countFocus = 0, finalFocus = 0, currentGroupLen = OriginData.length;

        // 所有组取平均值
        for(var j = 0; j < OriginData.length; j++) {

            //if(!S1OriginData[j][i]) {
            //    currentGroupLen--;
            //    continue;
            //}
            countFocus += OriginData[j][i] ? OriginData[j][i].value[1] : 0;
        }

        if(isAverage) {
            finalFocus = (countFocus/currentGroupLen).toFixed(2);
        }else {
            finalFocus = countFocus
        }

        targetData.push({
            name: OriginData[longestInfo.longestIndex][i].name,
            value: [
                OriginData[longestInfo.longestIndex][i].name,
                finalFocus
            ]
        });

        var arr = [];
        arr.push(getGMTTime(OriginData[longestInfo.longestIndex][i].name), finalFocus);
        dataSets.data.push(arr);

    }

    var csv = Papa.unparse(dataSets, {
        quotes: false,
        delimiter: ",",
        newline: "\r\n"
    });

    return csv;
}

//得到最长数组的长度和索引
function getLongestArrayInfo(arr) {

    var maxLen = 0, longestIndex = 0;

    for(var i = 0; i < arr.length; i++) {

        if(arr[i].length > maxLen) {

            maxLen = arr[i].length;
            longestIndex = i;
        }

    }

    return {
        maxLen: maxLen,
        longestIndex: longestIndex
    };

}

function getGMTTime(date) {

    return date.getMonth() + "-" + date.getDay() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}