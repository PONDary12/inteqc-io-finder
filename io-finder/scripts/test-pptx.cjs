const pptxgen = require('pptxgenjs');
const pptx = new pptxgen();

console.log('rect:', pptx.ShapeType.rect);
console.log('rightArrow:', pptx.ShapeType.rightArrow);
console.log('line:', pptx.ShapeType.line);
