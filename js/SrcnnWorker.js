"use strict";
importScripts('https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.3/require.min.js');

self.onmessage = function(e) {
	require(['SrcnnHandler'], SrcnnHandler => {
    console.log("Start Worker");
    console.log("SrcnnHandler params:", e.data);
		
    var srcnnHandler = new SrcnnHandler({
      scale2xModel: e.data.scale2xModel,
      noiseModel: e.data.noiseModel,
      scale: e.data.scale
    });

    var imageData = e.data.imageData;
    srcnnHandler.calc(imageData.data, imageData.width, imageData.height, function(image2x, width, height, elapsedTime) {
      self.postMessage({
        command: 'result',
        image2x: image2x,
        width: width,
        height: height,
        elapsedTime: elapsedTime
      });
    }, function(phase, doneRatio, allBlocks, doneBlocks) {
      self.postMessage({
        command: 'progress',
        phase: phase,
        doneRatio: doneRatio,
        allBlocks: allBlocks,
        doneBlocks: doneBlocks
      });
    });
  });
};
