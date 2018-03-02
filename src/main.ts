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
  'Seed': 2, // A function pointer, essentially
  'Reload Scene': loadScene, // A function pointer, essentially
  'Iterations': 10, // A function pointer, essentially
  'Iterate': iterPlus, // A function pointer, essentially
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
let iters = 0;
let seed = 2;

function loadScene() {
    flag = true;
    citylayout = new CityLayout(vec2.fromValues(20,20), vec2.fromValues(20.0,20.0));
    citylayout.genCity(controls.Iterations, controls.Seed);
    citymesh.citylayout = citylayout;
}


function iterPlus() {
    //iters++;
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
  gui.add(controls, 'Seed', 0, 10).step(1);
  gui.add(controls, 'Reload Scene');
  gui.add(controls, 'Iterations', 1, 40).step(1);
  gui.add(controls, 'Iterate');


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
  citylayout.genCity(iters, seed);

  citymesh = new CityMesh(vec3.fromValues(0,0,0), citylayout);
  citymesh.create();
  loadScene();



  const camera = new Camera(vec3.fromValues(-5, 7, 10), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.7, 0.8, 0.9, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  const customShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);


  // This function will be called every frame
  function tick() {
    if(flag) {
      citymesh.clearArrs();
      let win_frame = loadMeshData(output[0][0]);
      let win_glass = loadMeshData(output[0][1]);
      let build_base = loadMeshData(output[1][0]);
      let build_level = loadMeshData(output[1][1]);
      let build_roof = loadMeshData(output[1][2]);
      let build_bord = loadMeshData(output[1][3]);
      let pokecenterv = loadMeshData(output[2][0]);
      let pokecenter_red = loadMeshData(output[2][1]);
      let pokecenter_win = loadMeshData(output[2][2]);
      let tree = loadMeshData(output[3][0]);
      let tree_trunk = loadMeshData(output[3][1]);
      let gym_base = loadMeshData(output[4][0]);
      let gym_brown = loadMeshData(output[4][1]);
      let split_building = loadMeshData(output[5][0]);
      citymesh.storeBuildingVerts(win_frame.vertices, 0, 0 , [1,1,0]);
      citymesh.storeBuildingVerts(win_glass.vertices, 0, 1 , [0.9,0.9,1.0]);
      citymesh.storeBuildingVerts(build_base.vertices, 1, 0, [0,0,1]);
      citymesh.storeBuildingVerts(build_level.vertices, 1, 1, [0,1,1]);
      citymesh.storeBuildingVerts(build_roof.vertices, 1, 2, [0,1,0.5]);
      citymesh.storeBuildingVerts(build_bord.vertices, 1, 3, [0,1,0.5]);
      citymesh.storeBuildingVerts(pokecenterv.vertices, 2, 0 , [0.9,0.9,1.0]);
      citymesh.storeBuildingVerts(pokecenter_red.vertices, 2, 1 , [0.9,0.1,0]);
      citymesh.storeBuildingVerts(pokecenter_win.vertices, 2, 2 , [0.0,0.8,9]);
      citymesh.storeBuildingVerts(tree.vertices, 3, 0 , [0.9,0.2,0.1]);
      citymesh.storeBuildingVerts(tree_trunk.vertices, 3, 1 , [0.5,0.2,0.05]);
      citymesh.storeBuildingVerts(gym_base.vertices, 4, 0 , [0.9,0.9,1.0]);
      citymesh.storeBuildingVerts(gym_brown.vertices, 4, 1 , [0.9,0.9,1.0]);
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

  readTextFile("/src/geometry/win_frame.obj", 0 ,0);
  readTextFile("/src/geometry/win_glass.obj", 0 ,1);
  readTextFile("/src/geometry/build_base.obj", 1 ,0);
  readTextFile("/src/geometry/build_level.obj", 1 ,1);
  readTextFile("/src/geometry/build_roof.obj", 1 ,2);
  readTextFile("/src/geometry/build_roof.obj", 1 ,3);
  readTextFile("/src/geometry/pokecenter.obj", 2, 0);
  readTextFile("/src/geometry/pokecenter_red.obj", 2, 1);
  readTextFile("/src/geometry/pokecenter_win.obj", 2, 2);
  readTextFile("/src/geometry/tree.obj", 3, 0);
  readTextFile("/src/geometry/tree_trunk.obj", 3, 1);
  readTextFile("/src/geometry/gym_base.obj", 4, 0);
  readTextFile("/src/geometry/gym_brown.obj", 4, 1);
  readTextFile("/src/geometry/split_building.obj", 5, 0);

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
  return {
    primitiveType: 'TRIANGLES',
    vertices: vertices,
    vertexCount: vertexCount
  };
}