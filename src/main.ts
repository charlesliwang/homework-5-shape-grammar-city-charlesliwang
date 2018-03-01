import {vec2, vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import LSystem from './lsystem';
import CityMesh from './geometry/CityMesh';
import {Building} from "./citylayout";
import {CityLayout} from "./citylayout";
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 7,
  'Load Scene': loadScene, // A function pointer, essentially
  'Iterate': iterPlus, // A function pointer, essentially
  color: [60,130,23,1],
  'Shader' : 'Lambert'
};

let icosphere: Icosphere;
let square: Square;
let lsystem: LSystem;
let citymesh: CityMesh;
let cube: Cube;
let time = 300;
let flag = false;
let output: string[][] = [];
let objloaded: boolean[][] = [];
let citylayout: CityLayout;
let iters = 2;

function loadScene() {
  flag = true;
}

function iterPlus() {
    iters++;
    citylayout.iterCityGrowth();
    flag = true;
}



function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  //const text = new GUIText();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'Iterate');
  const colorPicker = gui.addColor(controls, 'color');
  gui.add(controls, 'Shader', [ 'Lambert'] );
 
  const colorPicked = vec4.fromValues(controls.color[0]/255,controls.color[1]/255,controls.color[2]/255,1)
      
  // Display new color whenever color is changed
  colorPicker.onChange(function() {
    const colorPicked = vec4.fromValues(controls.color[0]/255,controls.color[1]/255,controls.color[2]/255,1)
      lambert.setGeometryColor(colorPicked);
      customShader.setGeometryColor(colorPicked);
  });

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);
  

  //LSYSTEM INIT 
  // Initial call to load scene
  citylayout = new CityLayout(vec2.fromValues(20,20), vec2.fromValues(20.0,20.0));
  citylayout.genCity(iters);

  citymesh = new CityMesh(vec3.fromValues(0,0,0), citylayout);
  citymesh.create();
  loadScene();



  const camera = new Camera(vec3.fromValues(-5, 7, 10), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  const customShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);

  lambert.setGeometryColor(colorPicked);
  customShader.setGeometryColor(colorPicked);

  // This function will be called every frame
  function tick() {
    if(flag) {
      citymesh.clearArrs();
      let win_frame = loadMeshData(output[0][0]);
      let win_glass = loadMeshData(output[0][1]);
      let build_base = loadMeshData(output[1][0]);
      let build_level = loadMeshData(output[1][1]);
      let build_roof = loadMeshData(output[1][2]);
      let pokecenterv = loadMeshData(output[2][0]);
      let pokecenter_red = loadMeshData(output[2][1]);
      let pokecenter_win = loadMeshData(output[2][2]);
      let tree = loadMeshData(output[3][0]);
      let tree_trunk = loadMeshData(output[3][1]);
      let gym_base = loadMeshData(output[4][0]);
      let split_building = loadMeshData(output[5][0]);
      citymesh.storeBuildingVerts(win_frame.vertices, 0, 0 , [1,1,0]);
      citymesh.storeBuildingVerts(win_glass.vertices, 0, 1 , [0.9,0.9,1.0]);
      citymesh.storeBuildingVerts(build_base.vertices, 1, 0, [0,0,1]);
      citymesh.storeBuildingVerts(build_level.vertices, 1, 1, [0,1,1]);
      citymesh.storeBuildingVerts(build_roof.vertices, 1, 2, [0,1,0.5]);
      citymesh.storeBuildingVerts(pokecenterv.vertices, 2, 0 , [0.9,0.9,1.0]);
      citymesh.storeBuildingVerts(pokecenter_red.vertices, 2, 1 , [0.9,0.1,0]);
      citymesh.storeBuildingVerts(pokecenter_win.vertices, 2, 2 , [0.0,0.8,9]);
      citymesh.storeBuildingVerts(tree.vertices, 3, 0 , [0.9,0.1,0]);
      citymesh.storeBuildingVerts(tree_trunk.vertices, 3, 1 , [0.0,0.8,9]);
      citymesh.storeBuildingVerts(gym_base.vertices, 4, 0 , [0.0,0.8,0.0]);
      citymesh.storeBuildingVerts(split_building.vertices, 5, 0 , [0.8,0.5,0.0]);
      citymesh.loadBuildings(citylayout.buildings);
      citymesh.create();
      flag = false;
    }
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    time = (time + 1) % 300;
    if(true) {
      renderer.render(camera, lambert, [
        //icosphere,
        //square,
        //cube,
        citymesh,
      ]);
    } 

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  readTextFile("/src/obj/win_frame.obj", 0 ,0);
  readTextFile("/src/obj/win_glass.obj", 0 ,1);
  readTextFile("/src/obj/build_base.obj", 1 ,0);
  readTextFile("/src/obj/build_level.obj", 1 ,1);
  readTextFile("/src/obj/build_roof.obj", 1 ,2);
  readTextFile("/src/obj/pokecenter.obj", 2, 0);
  readTextFile("/src/obj/pokecenter_red.obj", 2, 1);
  readTextFile("/src/obj/pokecenter_win.obj", 2, 2);
  readTextFile("/src/obj/tree.obj", 3, 0);
  readTextFile("/src/obj/tree_trunk.obj", 3, 1);
  readTextFile("/src/obj/gym_base.obj", 4, 0);
  readTextFile("/src/obj/split_building.obj", 5, 0);

  // Start the render loop
  tick();
}


main();

function readTextFile(file: string, i: number, j : number)
{
  flag=false;
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, true);
    var allText = "";
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                allText = rawFile.responseText;
                setOutputText(allText, i, j);
                //alert(allText);
            }
        }
    }
    rawFile.send(null);
    return allText;
}

function setOutputText(allText:string, i : number, j : number) {
  flag = false;
  if(output[i] == undefined) {
    output[i] = [];
  }
  output[i][j]  = allText;
}

// https://dannywoodz.wordpress.com/2014/12/16/webgl-from-scratch-loading-a-mesh/

function loadMeshData(string: string) {
  if (string == undefined) {
    console.log("string undefined");
    return;
  }
  var lines = string.split("\n");
  var positions : vec3[] = [];
  var normals : vec3[] = [];
  var vertices : number[] = [];
 
  for ( var i = 0 ; i < lines.length ; i++ ) {
    var parts = lines[i].trimRight().split(' ');
    if ( parts.length > 0 ) {
      switch(parts[0]) {
        case 'v':  positions.push(
          vec3.fromValues(
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          ));
          break;
        case 'vn':
          normals.push(
            vec3.fromValues(
              parseFloat(parts[1]),
              parseFloat(parts[2]),
              parseFloat(parts[3])
          ));
          break;
        case 'f': {
          var f1 = parts[1].split('/');
          var f2 = parts[2].split('/');
          var f3 = parts[3].split('/');
          Array.prototype.push.apply(
            vertices, positions[parseInt(f1[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f1[2]) - 1]
          );
          Array.prototype.push.apply(
            vertices, positions[parseInt(f2[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f2[2]) - 1]
          );
          Array.prototype.push.apply(
            vertices, positions[parseInt(f3[0]) - 1]
          );
          Array.prototype.push.apply(
            vertices, normals[parseInt(f3[2]) - 1]
          );
          break;
        }
      }
    }
  }
  var vertexCount = vertices.length / 6;
  console.log("Loaded mesh with " + vertexCount + " vertices");
  return {
    primitiveType: 'TRIANGLES',
    vertices: vertices,
    vertexCount: vertexCount
  };
}