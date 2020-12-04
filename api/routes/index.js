var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/:uid', function(req, res, next) {

  const { uid } = req.params;
  req.collection.find({uid:uid})
  .toArray()
  .then(results => res.json(results))
  .catch(error => res.send(error))
});

router.post('/', function(req, res, next){
  const { uid , note } = req.body;
  const payload = { uid, note};
  req.collection.insertOne(payload)
  .then(result=>res.json(result))
  .catch(error=>res.send(error));
});

router.delete('/', (req, res, next)=>{
  const { uid } = req.body;
  req.collection.deleteOne({uid})
  .then(result=>res.json(result))
  .then(error=>res.send(error));
})

module.exports = router;
