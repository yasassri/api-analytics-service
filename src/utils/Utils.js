var formatTimeChunk = function (t) {
    if (t < 10) {
        t = "0" + t;
    }
    return t;
};

var convertTimeStringToUTC = function(date){
    let d = new Date(date);
    let formattedDate = d.getUTCFullYear() + "-" + formatTimeChunk((d.getUTCMonth()+1)) + "-" + formatTimeChunk(d.getUTCDate()) + " " + formatTimeChunk(d.getUTCHours())
                            + ":" + formatTimeChunk(d.getUTCMinutes()) + ":" + formatTimeChunk(d.getUTCSeconds());
    return formattedDate;
};

var round = function(number) {
    return Math.round(( number + Number.EPSILON) * 100) / 100;
}

module.exports = { convertTimeStringToUTC, round };