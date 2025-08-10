(function(global){
  class BrowserMultiFormatReader {
    constructor() {
      this.detector = null;
      this._stop = false;
    }
    decodeFromVideo(video) {
      if (!this.detector) {
        if ('BarcodeDetector' in global) {
          this.detector = new BarcodeDetector();
        } else {
          return Promise.reject(new Error('BarcodeDetector API not supported'));
        }
      }
      this._stop = false;
      const det = this.detector;
      return new Promise((resolve, reject) => {
        const scan = async () => {
          if (this._stop) {
            resolve(null);
            return;
          }
          try {
            const codes = await det.detect(video);
            if (codes.length > 0) {
              resolve({ getText: () => codes[0].rawValue });
              return;
            }
          } catch (err) {
            reject(err);
            return;
          }
          requestAnimationFrame(scan);
        };
        scan();
      });
    }
    cancel() {
      this._stop = true;
    }
  }
  global.ZXing = { BrowserMultiFormatReader };
})(window);
