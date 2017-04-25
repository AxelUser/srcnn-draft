(function(global) {
  "use strict";
  requirejs.config({
    "paths": {
      "vue": "//cdnjs.cloudflare.com/ajax/libs/vue/2.2.4/vue.min",
      "vue-resource":"//cdnjs.cloudflare.com/ajax/libs/vue-resource/1.2.1/vue-resource.min"
    }
  });
  require(['vue', 'vue-resource'], (Vue, VueResource) => {
		const MODEL_URL = 'js/scale2.0x_model.json';
    let worker = null;
    
    Vue.use(VueResource);
        
    global.viewModel = new Vue({
      el: '#app',
      data: {
        model: null,
        image: null,
        imageHeight: 0,
        imageWidth: 0,
        upscaledFile: null,
        scale: 2,
        progressRatio: 0,
        progressMessage: null,
        isRunning: false,
        isShownModified: false
      },
      computed: {
        cancelButtonText() {
          return this.isRunning? "Cancel": "Remove image";
        },
        toggleButtonText() {
          return this.isShownModified? "Show original": "Show modified";
        },        
        isReady() {
          return !this.isRunning && this.upscaledFile !== null;
        },
        getImagePreviewSource() {
          if(this.image !== null) {
           	return this.isShownModified? this.upscaledFile: this.image.src;
          } else {
            return null;
          }
        },
        currentImageHeight() {
          return this.isShownModified? this.imageHeight * 2 : this.imageHeight;
        },
        currentImageWidth() {
          return this.isShownModified? this.imageWidth * 2 : this.imageWidth;
        }        
      },
      methods: {
        toggleImage() {
          this.isShownModified = !this.isShownModified;
        },
        loadModel() {
          this.$http.get(MODEL_URL)
          	.then((file) => {
            	file.json().then(jsonModel => {
                this.model = jsonModel;
                console.log("Model was loaded.");
              });
          	});
        },
        startProcess() {
          let canvas = document.createElement('canvas');
          let context = canvas.getContext('2d');
          canvas.width = this.imageWidth;
          canvas.height = this.imageHeight;
          context.drawImage(this.image, 0, 0);
          let imageData = context.getImageData(0, 0, this.imageWidth, this.imageHeight);
          this.restartWorker();
          worker.postMessage({
            scale2xModel: this.model,
            noiseModel: null,
            scale: this.scale,
            imageData: imageData
          });
          this.isRunning = true;
        },
        onFileChange(e) {
          let files = e.target.files || e.dataTransfer.files;
          if (!files.length)
            return;
          this.createImage(files[0]);
        },
        createImage(file) {
          const reader = new FileReader();
					const vm = this; 
          reader.onload = (file) => {
            this.image = new Image();
            this.image.onload = function(){
              vm.imageWidth = this.naturalWidth;
              vm.imageHeight = this.naturalHeight;
            };
            this.image.src = file.target.result;
          };
          reader.readAsDataURL(file);
        },
        cancel() {
          if(this.isRunning) {
            this.stopWorker();
          } else {
            this.image = null;
            this.upscaledFile = null;
            this.progressMessage = null;            
          }
          this.isShownModified = false;
        },
       	restartWorker() {
          this.stopWorker();
          this.createWorker();
        },
        stopWorker() {
          if(worker !== null) {
            this.progressMessage = null;
            worker.terminate();
            worker = null;
            this.isRunning = false;
            this.upscaledFile = null;
          }
        },
        createWorker() {
         	worker = new Worker('js/SrcnnWorker.js');
          worker.onmessage = (e) => {
            // result
            if (e.data.command != 'progress') {
              let image2x = e.data.image2x;
              let width = e.data.width;
              let height = e.data.height;
              let canvas2x = document.createElement('canvas');
              canvas2x.width = width;
              canvas2x.height = height;
              let context2x = canvas2x.getContext('2d');
              let imageData2x = context2x.createImageData(width, height);
              imageData2x.data.set(image2x);
              context2x.putImageData(imageData2x, 0, 0);
              this.upscaledFile = canvas2x.toDataURL();
              this.isRunning = false;
              this.progressMessage = `Done! Elapsed time: ${e.data.elapsedTime}ms.`;
              return;
            }

            // progress
            if (e.data.phase == 'scale' || e.data.phase == 'denoise') {
              let message = e.data.phase == 'scale' ? 'Scaling image : ' : 'Denoising image : ';
              message += e.data.doneBlocks + ' / ' + e.data.allBlocks + ' blocks done';

              this.progressRatio = Math.round(e.data.doneRatio);
              this.progressMessage = message;
              console.log(this.progressMessage);
              return;
            }
            if (e.data.phase == 'decompose') {
              this.progressMessage = 'Decomposing image';
              console.log(this.progressMessage);
              return;
            }
            if (e.data.phase == 'recompose') {
              this.progressMessage = 'Recomposing image';
              console.log(this.progressMessage);
              return;
            }
            console.log('Received an unknown message from worker');
          }
        }
      },
      mounted(){
        this.loadModel();
      }
    });
  });
})(window);
