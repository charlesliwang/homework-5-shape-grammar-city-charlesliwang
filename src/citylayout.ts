import {vec2, vec3, mat4} from 'gl-matrix';
export class Building {

    bType : number = 1;
    pos : vec3;
    angle: number = 0;
    iters: number = 0;
    numFloors: 1;

    constructor(position: vec3, scale: vec2, bType: number) {
        this.pos = position;
        this.bType = bType;
    }

    func() {
        return 1;
    }
}

export class CityLayout {

    grid : number[][][] = [];
    bounds : vec2;
    dim : vec2;
    gridDim : vec2;
    buildings: Building[] = [];
    hasCenter: boolean = false;
    hasGym: boolean = false;
    iters: number = 0;

    constructor(dim: vec2, bounds: vec2) {
        this.bounds = bounds;
        this.dim = dim;
        this.gridDim = vec2.create();
        for(let i = 0; i < dim[0]; i++) {
            let x = [];
            for(let j = 0; j < dim[1]; j++) {
                x.push([0,-1]);
            }
            this.grid[i] = x;
        }
        vec2.divide(this.gridDim, [this.bounds[0] * 2, this.bounds[1] * 2], this.dim);
    }

    genCity(iters: number) {

        let x0 = Math.floor(this.hash(iters + 30) * this.dim[0]);
        let y0 = Math.floor(this.hash(iters + 70) * this.dim[1]);
        let b = new Building(vec3.fromValues(0.0,0.0,0.0), vec2.fromValues(1.0,1.0), 2);

        x0 = Math.floor(this.hash(iters + 100) * this.dim[0]);
        y0 = Math.floor(this.hash(iters + 1000) * this.dim[1]);
        let b2 = new Building(this.gridToWorld(x0,y0), vec2.fromValues(1.0,1.0), 1);

        x0 = Math.floor(this.hash(iters + 200) * this.dim[0]);
        y0 = Math.floor(this.hash(iters + 400) * this.dim[1]);

        let b4 = new Building(this.gridToWorld(x0,y0), vec2.fromValues(1.0,1.0), 1);
        b4.angle = -90;
        
        this.pushBuilding(b, this.buildings, 3);
        this.pushBuilding(b2, this.buildings, 2);
        this.pushBuilding(b4, this.buildings, 2);
        console.log(this.grid);
        this.placeGym(vec3.fromValues(2.0,0.0,0.0), this.buildings);
        for(let i = 0; i < 80; i++) {
            let x = Math.floor(this.hash(iters + i) * this.dim[0]);
            let y = Math.floor(this.hash(iters + 50 + i) * this.dim[1]);
            let pos = this.gridToWorld(x,y);
            
            let b3 = new Building(pos, vec2.fromValues(1.0,1.0), 3);
            if(this.canPlaceBuilding(pos, 1)) {
                b3.iters = Math.floor(this.hash(pos[0]) * 3);
                this.pushBuilding(b3, this.buildings, 1);
            }
        }
        //this.pushBuilding(b2, this.buildings);
        //this.canPlaceBuilding(b2.pos);
        // for(let i = 0; i < iters; i++) {
        //     this.iterCityGrowth();
        // }
    }

    iterCityGrowth() {
        console.log(this.buildings);
        let new_buildings : Building[] = [];
        for(let i = 0; i < this.buildings.length; i++) {
            let building = this.buildings[i];
            if(building == undefined) {
                console.log("undefined!!");
                continue;
            }
            let bType = building.bType;
            let pos = building.pos;
            if(building.bType == 2) { //POKECENTER
                let new_pos = vec3.fromValues(pos[0] + 2.0,0,pos[2]);
                if(this.canPlaceBuilding(new_pos, 2)){
                    let b = new Building(new_pos, vec2.fromValues(1.0,1.0), 1);
                    this.pushBuilding(b, new_buildings, 2);
                }
                this.pushBuilding(building, new_buildings, 2);
            }
            else if(building.bType == 1) { //STACKABLE BUILDING
                let b = new Building(pos, vec2.fromValues(1.0,1.0), bType);
                let stack_prob = this.hash(this.iters + b.pos[0]);
                if(stack_prob > 0.5) {
                    building.iters++;
                }
                console.log(stack_prob);
                
                // if(stack_prob < 0.05 && building.iters < 1 && this.hash(stack_prob * 500) > 0.2) {
                //     let bs = new Building(pos, vec2.fromValues(1.0,1.0), 5);
                //     this.pushBuilding(bs, new_buildings, 2);
                // }
                // else {
                    this.pushBuilding(building, new_buildings, 2);
                //} 
                if(this.hash(stack_prob) > 0.5) {
                    let dpos = [0.0,0.0,0.0];
                    let idx = this.hash(stack_prob + b.pos[0]);
                    let neg = this.hash(b.pos[0] - b.pos[2]);
                    let mult = Math.floor(this.hash(-b.pos[0] - b.pos[2] + 500) * 2.0)  + 2.0;
                    if(idx > 0.5) {
                        dpos = [2.0,0.0,0.0];
                    } else {
                        dpos = [0.0,0.0,2.0];
                    }
                    if(neg > 0.5) {
                        dpos = [-mult* dpos[0],-dpos[1],-mult *dpos[2]]
                    }

                    let new_pos = vec3.fromValues(pos[0] + dpos[0],0,pos[2] + dpos[2]);
                    let b2 = new Building(new_pos, vec2.fromValues(1.0,1.0), bType);
                    
                    if(this.canPlaceBuilding(new_pos, 2)){
                        this.pushBuilding(b2, new_buildings, 2);
                    }
                }
            }
            else if(building.bType == 3) { //TREE
                this.pushBuilding(building,new_buildings, 1);
            }else if(building.bType == 4) { //TREE
                this.pushBuilding(building,new_buildings, 3);
            }
             else {
                this.pushBuilding(building,new_buildings, 2);
            }
            
        }
        this.iters++;
        this.buildings = new_buildings;
    }

    


    pushBuilding(b: Building, new_buildings: Building[], i: number) {
        new_buildings.push(b);
        let gPos = this.worldToGrid(b.pos);
        this.grid[gPos[0]][gPos[1]][0] = i;
        this.grid[gPos[0]][gPos[1]][1] = new_buildings.length - 1;
    }

    canPlaceBuilding(pos: vec3, i: number) {
        let gPos = this.worldToGrid(pos);
        if(gPos[0] >= this.dim[0] || gPos[0] < 0 || gPos[1] >= this.dim[1] || gPos[1] < 0){
            console.log("TRYING TO GO OUT OF BOUNDS");
            return false;
        }
        console.log(gPos);
        if(this.grid[gPos[0]][gPos[1]][0] < i) {
            if(this.grid[gPos[0]][gPos[1]][0] == 1) {
                this.buildings[this.grid[gPos[0]][gPos[1]][1]] = undefined;
            } 
            return true;
        } 
        return false;
    }

    placeGym(pos: vec3, new_buildings: Building[]) {
        this.clearBuildings(pos, 1);
        let gym = new Building(pos, vec2.fromValues(1.0,1.0), 4);
        this.pushBuilding(gym, new_buildings, 3);
    }

    clearBuildings(pos: vec3, rad: number) {
        let gPos = this.worldToGrid(pos);
        console.log(gPos);
        for(let i = 0; i <=  rad; i++) {
            for(let j = 0; j <=  rad; j++) {
                let x = gPos[0] + i;
                let y = gPos[1] + j;
                console.log(x + " " + y);
                if(this.grid[x][y][0] < 3) {
                    if(this.grid[x][y][0] < 3) {
                        console.log("CLEAR BUILDINGS");
                        this.buildings[this.grid[x][y][1]] = undefined;
                    } 
                }
            }
        }
    }

    gridToWorld(x:number, y: number) {
        let wPos = vec2.create();
        vec2.copy(wPos, this.gridDim)
        vec2.multiply(wPos, wPos, [x,y]);
        vec2.sub(wPos,wPos, this.bounds);
        return vec3.fromValues(wPos[0], 0 ,wPos[1] );
    }

    worldToGrid(pos: vec3) {
        let gPos = vec2.fromValues(pos[0], pos[2]);
        vec2.add(gPos,gPos, this.bounds);
        vec2.divide(gPos,gPos,this.gridDim);
        return vec2.fromValues(Math.floor(gPos[0]), Math.floor(gPos[1]));
    }

    hash(x: number) {
        let f = Math.sin(vec3.dot(vec3.fromValues(x,x,x), vec3.fromValues(12.9898, 78.233, 78.156))) * 43758.5453;
        return f - Math.floor(f);
      }

  };
  
//export default CityLayout;