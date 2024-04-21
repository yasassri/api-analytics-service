const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiCntroller')
const reportController = require('../controllers/reportController')
const { log } = require("../utils/logger")
const { GRANULARITY } = require("../Constants")

router.get('/apis', async (req, res) => {
    let apis = await apiController.getAPIList();
    return res.json(apis);
});


router.get('/data/summary/:granularity/:apiName/:startDate/:startTime/:endDate/:endTime', async (req, res) => {

    console.log("DDDDDDDD")
    console.log(JSON.stringify(req.query))
    console.log(JSON.stringify(req.params))

    // const { granularity, apiName, startDate, startTime, endDate, endTime } = req.query;
    const { granularity, apiName, startDate, startTime, endDate, endTime } = req.params;

    if (!granularity || !apiName || !startDate || !startTime || !endDate || !endTime) {
        return res.status(400).json({ error: 'Missing query parameters' });
    }

    // Check if granularity is provided and valid
    if (!Object.values(GRANULARITY).includes(granularity)) {
        return res.status(400).json({ error: 'Invalid granularity' });
    }

    try {
        let startTimeD = new Date(startDate.trim() + " " + startTime.trim()).getTime();
        let endTimeD = new Date(endDate.trim() + " " + endTime.trim()).getTime();
        let latencyData = await reportController.getApplicationAnalytics(granularity, apiName, startTimeD, endTimeD);
        res.json(latencyData);

    } catch (error) {
        log.error(error);
        return res.status(500).json({ error: 'Error while summarizind data.' });
    }

});

module.exports = router;
