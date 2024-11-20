import React from 'react';
import { View, Text, Dimensions, Platform, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';

import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { Camera, CameraType } from 'expo-camera';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import Canvas from 'react-native-canvas';

////////////////
const TensorCamera = cameraWithTensors(Camera);

const IS_ANDROID = Platform.OS === 'android';
const IS_IOS = Platform.OS === 'ios';

// const { width, height } = Dimensions.get('window');
const width = Dimensions.get('window').width;
const height = width / (IS_IOS ? 9 / 16 : 3 / 4);

// Home screen component
const HomeScreen = () => {
  const [model, setModel] = React.useState<cocoSsd.ObjectDetection>();
  const [type, setType] = React.useState(CameraType.front);
  let context = React.useRef<CanvasRenderingContext2D>();
  let canvas = React.useRef<Canvas>();

  let textureDims = Platform.OS === 'ios' ? { height: 1920, width: 1080 } : { height: 1200, width: 1600 };


  React.useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync()
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('CAMERA PERMISSIONS STATUS: ', status)
      await tf.ready();
      setModel(await cocoSsd.load());
    })()
  },[]);

  ////////// HANDLE CAMERA STREAM
  function handleCameraStream(images: any) {
    console.log("Camera stream ready");
    
    const loop = async () => {      
      const nextImageTensor = images.next().value;
      
      if (!model || !nextImageTensor) throw new Error('No model or image tensor');
      
      model.detect(nextImageTensor).then((prediction) => {
        console.log("Prediction: ", prediction && prediction[0].class);
        
        drawRectangle(prediction, nextImageTensor);
      }).catch((error) => {
        console.log("stream error: ", error);
      })

      requestAnimationFrame(loop)
    };

    loop();
  };

//////////////////// DRAW RECTANGLES
  function drawRectangle(predictions: cocoSsd.DetectedObject[], nextImageTensor: any) {
    
    if (!context.current || !canvas.current) return;

    const scaleWidth = width / nextImageTensor.shape[1];
    const scaleHeight = height / nextImageTensor.shape[0];

    const flipHorizontal = Platform.OS === 'ios' ? false : true;

    //clear prev prediction
    context.current.clearRect(0, 0, width, height);

    // draw rectangle for each prediction
    for (const prediction of predictions) {
      if (prediction.score < 0.75) return;

      const [x, y, width, height] = prediction.bbox;

      const boundingBoxX = flipHorizontal ? canvas.current.width - x * scaleWidth - width * scaleWidth : x * scaleWidth;
      const boundingBoxY = y * scaleHeight;

      // draw rectangle and texts
      context.current.strokeRect(boundingBoxX, boundingBoxY, width * scaleWidth, height * scaleHeight);

      // draw the label 
      context.current.strokeText(
        // prediction.class + " " + Math.floor(prediction.score * 100),
        `${ prediction.class }: ${ Math.floor(prediction.score * 100) }%`,
        boundingBoxX - 15,
        boundingBoxY - 15
      )
    }
  };

  ////////////// CANVAS
  async function handleCanvas(can: Canvas) {
    if (can) {
      can.width = width;
      can.height = height;
      // const ctx = can.getContext('2d') as unknown as CanvasRenderingContext2D;
      const ctx : CanvasRenderingContext2D = can.getContext('2d')
      ctx.strokeStyle = 'green';
      ctx.fillStyle = 'green';
      ctx.lineWidth = 3;
      ctx.font = '30px Arial';


      context.current = ctx;
      canvas.current = can;
    }
  }


  return (
    <View style={styles.container}>
      <Text>HomeScreen</Text>

      <TensorCamera 
        style={styles.camera}
        type={type}
        cameraTextureHeight={ textureDims.height }
        cameraTextureWidth={ textureDims.width }
        resizeHeight={ 200 }
        resizeWidth={ 152 }
        resizeDepth={ 3 }
        onReady={handleCameraStream}
        autorender={true}
        useCustomShadersToResize={false}
      />
      <Canvas style={styles.canvas} ref={handleCanvas} />
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    zIndex: 100000,
    width: '100%',
    height: '100%',
  },
  // container: {
  //   flex: 1,
  //   justifyContent: 'center',
  // },
  container: {
    position: 'relative',
    width: width,
    height: height,
    marginTop: Dimensions.get('window').height / 2 - height / 2,
  },
  // camera: {
  //   flex: 1,
  // },
  camera: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
})

// Main app component with navigation
const App = () => {
  return (
    <HomeScreen />
  );
};

// Register the main app component
registerRootComponent(App);

export default App;
