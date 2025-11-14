const { HowLongToBeatService } = require('howlongtobeat');

const hltb = new HowLongToBeatService();
hltb.search('God of War').then(result => {
  console.log(result[0]);
});
