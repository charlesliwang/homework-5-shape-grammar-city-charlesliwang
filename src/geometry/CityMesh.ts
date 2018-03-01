import {vec2, vec3, vec4, mat4, quat} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {CityLayout} from '../citylayout';
import {Building} from '../citylayout';
import Turtle from "../turtle";
import {gl} from '../globals';
import { lstat } from 'fs';


class CityMesh extends Drawable {
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  idx: number[] = [];
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  idx_off: number = 0;
  turtles: Turtle[] = [];
  buildings_vertices: number[][][] = [];
  buildings_cols: number[][][] = [];
  buildings : Building[];
  citylayout : CityLayout;

  center: vec4;
  cylSubD: number = 8;

  constructor(center: vec3, citylayout: CityLayout) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    this.citylayout = citylayout;
    //this.lsystem = "[AAA[+AA[*AAA[*AAA]A]A]AA]";
    //this.createBranch(vec3.fromValues(0,0,0), vec3.fromValues(0,1,0), vec3.fromValues(0,0,1), 1, 0.5);
    //this.readLSystem(vec3.fromValues(0,0,0), vec3.fromValues(0,1,0), vec3.fromValues(0,0,1), 1, 0.5);
  }

  clearArrs() {
    this.pos = [];
    this.nor = [];
    this.idx = [];
    this.col = [];
  }
  create() {
    this.loadFloor();
    this.indices = new Uint32Array(this.idx);
    this.normals = new Float32Array(this.nor);
    this.positions = new Float32Array(this.pos);
    this.colors = new Float32Array(this.col);
    this.generateIdx();
    this.generatePos();
    this.generateNor();
    this.generateCol();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

    console.log(`Created CityMesh`);
  }

  storeBuildingVerts(vertices: number[], i : number, j : number, col : number[]) {
      if(this.buildings_vertices[i] == undefined) {
          this.buildings_vertices[i] = [];
          this.buildings_cols[i] = [];
      }
        this.buildings_vertices[i][j] = vertices;
        this.buildings_cols[i][j] = col;
  }

  pushBuildingVBOs(center:vec3, angle: number, scale: number, build_type : number, build_section: number, col: number[]) {
        let count = 0;
        let building_vertices = this.buildings_vertices[build_type][build_section];
        let building_cols = this.buildings_cols[build_type][build_section];
        
        for(let i = 0; i < building_vertices.length; i = i + 18) {
            let curr_idx = this.pos.length/4.0;
            for(let j = 0; j < 3; j++) {
                let v1 = building_vertices[i + 6*j];
                let v2 = building_vertices[i+1 + 6*j];
                let v3 = building_vertices[i+2 + 6*j];
                let v = vec3.fromValues(v1,v2,v3);
                //let angle = vec3.angle(vec3.fromValues(0,1,0),dir);
                let axis = vec3.fromValues(0,1,0);
                //vec3.cross(axis, vec3.fromValues(0,1,0),dir);
                let q = quat.create();
                quat.setAxisAngle(q, axis, angle * Math.PI / 180 );
                vec3.transformQuat(v,v,q);
                vec3.scale(v,v,scale);
                vec3.add(v,v,center);
                let n1 = building_vertices[i+3 + 6*j];
                let n2 = building_vertices[i+4 + 6*j];
                let n3 = building_vertices[i+5 + 6*j];
                let n = vec3.fromValues(n1,n2,n3);
                vec3.transformQuat(n,n,q);
                this.pos.push(v[0],v[1],v[2],1);
                this.nor.push(n[0],n[1],n[2],0);
                if(col[3] == 0){
                    this.col.push(building_cols[0],building_cols[1],building_cols[2],1);
                } else {
                    this.col.push(col[0],col[1],col[2],1);
                }
            }
            this.idx.push(curr_idx,curr_idx+1,curr_idx+2);
        }
  }

  loadBuildings(buildings : Building[]) {
      for(let i = 0; i < buildings.length; i++) {
          let building = buildings[i];
          if(building == undefined) {
              continue;
          }
          if(building.bType == 1) {
                this.stackBuildings(building, building.iters);
          } 
          else if(building.bType == 2){
            this.pushBuildingVBOs(building.pos, 0, 1, building.bType, 0, [1,0,0,0]);
            this.pushBuildingVBOs(building.pos, 0, 1, building.bType, 1, [1,0,0,0]);
            this.pushBuildingVBOs(building.pos, 0, 1, building.bType, 2, [1,0,0,0]);
          }
          else if(building.bType == 3) {
              this.placeTrees(building, building.iters)
          }
          else {
            console.log(building.bType);
            this.pushBuildingVBOs(building.pos, 0, 1, building.bType, 0, [1,0,0,0]);
          }
      }
  }

  stackBuildings(building: Building, iters: number) {
        let pos = vec3.create();
        vec3.copy(pos, building.pos);
        vec3.add(pos, pos, [this.hash(pos[2]) * 0.1, 0, this.hash(pos[0]) * 0.1]);
        let angle = building.angle;
        this.pushBuildingVBOs(pos, angle, 1, building.bType, 0, [0,0,1]);
        this.pushBuildingVBOs(vec3.fromValues(pos[0] - 0.5,pos[1],pos[2]), angle, 1, 0, 0, [0,0,1,0]);
        this.pushBuildingVBOs(vec3.fromValues(pos[0] - 0.5,pos[1],pos[2]), angle, 1, 0, 1, [0,0,1,0]);
        for(let i = 0; i < iters; i++) {
            this.pushBuildingVBOs(pos, angle, 1, building.bType, 1, [0,0,1,0]);
            vec3.add(pos, pos, [0,1,0]);
        }
        this.pushBuildingVBOs(pos, angle, 1, building.bType, 2, [0,0,1,0]);
  }

  placeTrees(building: Building, iters: number) {
      let pos = vec3.create();
      vec3.copy(pos, building.pos);
      vec3.add(pos,pos, [-0.2, 0,0]);
      for(let i = 0; i < iters + 1; i++) {
        vec3.add(pos,pos, [this.hash(i + pos[0]) * 0.5 - 0.5, 0 ,this.hash(i + pos[2]) * 0.5 - 0.5]);
        this.pushBuildingVBOs(pos, 0, 1, building.bType, 0, [1,0,0,0]);
        this.pushBuildingVBOs(pos, 0, 1, building.bType, 1, [1,0,0,0]);
      }
  }


  hash(x: number) {
    let f = Math.sin(vec3.dot(vec3.fromValues(x,x,x), vec3.fromValues(12.9898, 78.233, 78.156))) * 43758.5453;
    return f - Math.floor(f);
  }

    loadFloor() {
        let curr_idx = this.pos.length/4.0;
        let bound = vec2.create();
        vec2.copy(bound, this.citylayout.bounds);
        vec2.add(bound,bound,[2.0,2.0]);
        this.pos.push(bound[0], 0, -bound[1],1);
        this.pos.push(-bound[0], 0, -bound[1],1);
        this.pos.push(-bound[0], 0, bound[1],1);
        this.pos.push(bound[0], 0, bound[1],1);
        this.nor.push(0,1,0,0);
        this.nor.push(0,1,0,0);
        this.nor.push(0,1,0,0);
        this.nor.push(0,1,0,0);
        this.col.push(0.2,0.3,0.,1);
        this.col.push(0.2,0.3,0.,1);
        this.col.push(0.2,0.3,0.,1);
        this.col.push(0.2,0.3,0.,1);
        this.idx.push(curr_idx, curr_idx + 1, curr_idx + 2);
        this.idx.push(curr_idx, curr_idx + 2, curr_idx + 3);
    }


};

export default CityMesh;
