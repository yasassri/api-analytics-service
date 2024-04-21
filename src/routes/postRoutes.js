const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    const message = req.body.message;
    res.json({ receivedMessage: message });
});

module.exports = router;
