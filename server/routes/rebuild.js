const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname,'..','..');

router.post('/', auth(true), (req,res)=>{
  const py = spawn('python3', ['tools/build_pages.py'], { cwd: ROOT });
  let out = '';
  let err = '';
  py.stdout.on('data', d=> out+=d.toString());
  py.stderr.on('data', d=> err+=d.toString());
  py.on('close', code=>{
    if (code===0) res.json({ ok:true, output: out, error: err });
    else res.status(500).json({ ok:false, output: out, error: err || `exit ${code}` });
  });
  py.on('error', e=> res.status(500).json({ ok:false, error: e.message }));
});

module.exports = router;
