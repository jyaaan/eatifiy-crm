const fs = require('fs');

function fileHandler() {

}

fileHandler.prototype.writeToCSV = (data, filename, headers = []) => {
  return new Promise((resolve, reject) => {
    var lineArray = [];
    lineArray.push(headers);

    const tempStore = data.map(datum => {
      return datum + ',';
    });

    lineArray = lineArray.concat(...tempStore);
    const csvContent = lineArray.join('\n');

    fs.writeFile(
      './server/public/csv/' + filename + '.csv',
      csvContent,
      err => {
        if (err) {
          console.error('CSV Write Error');
          reject(err);
        } else {
          console.log(filename + '.csv saved :3');
          resolve('Write Successful');
        }
      }
    )
  });
}

fileHandler.prototype.saveCSV = (csv, filename) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      './server/public/csv/' + filename + '.csv',
      csv,
      err => {
        if (err) {
          console.error('CSV Save Error');
          reject(err);
        } else {
          console.log(filename + '.csv saved :3');
          resolve('Save Successful');
        }
      }
    );
  })
}

module.exports = fileHandler;