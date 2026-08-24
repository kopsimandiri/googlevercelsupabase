const fs = require('fs');
const files = [
  'public/assets/portfolio/industri-tepung-tapioka.jpg',
  'public/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
  'public/assets/portfolio/perikanan-tuna-ambon.jpg',
  'public/assets/portfolio/pertanian-jagung-wortel-cabe.jpg',
  'public/assets/portfolio/pertanian-panen-singkong.jpg'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const stats = fs.statSync(f);
    const buf = fs.readFileSync(f);
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    console.log(`${f}: size=${stats.size}, isJpeg=${isJpeg}, header=${buf.slice(0, 4).toString('hex')}`);
  } else {
    console.log(`${f}: NOT FOUND`);
  }
});
