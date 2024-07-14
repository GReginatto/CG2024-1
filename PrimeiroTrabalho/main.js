"use strict";

// Function to parse OBJ data
function parseOBJ(text) {
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  const objVertexData = [objPositions, objTexcoords, objNormals];
  let webglVertexData = [[], [], []];

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, j) => {
      if (!objIndexStr) return;
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[j].length);
      webglVertexData[j].push(...objVertexData[j][index]);
    });
  }

  const keywords = {
    v(parts) { objPositions.push(parts.map(parseFloat)); },
    vn(parts) { objNormals.push(parts.map(parseFloat)); },
    vt(parts) { objTexcoords.push(parts.map(parseFloat)); },
    f(parts) {
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
  };

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    const [keyword, ...args] = trimmedLine.split(/\s+/);
    const handler = keywords[keyword];
    if (handler) handler(args);
  }

  return {
    position: webglVertexData[0],
    texcoord: webglVertexData[1],
    normal: webglVertexData[2],
  };
}

// Vertex shader source code
const vs = `#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

out vec3 v_normal;
out vec2 v_texcoord;

void main() {
  gl_Position = u_projection * u_view * u_world * a_position;
  v_normal = mat3(u_world) * a_normal;
  v_texcoord = a_texcoord;
}
`;

// Fragment shader source code
const fs = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_texcoord;

uniform vec4 u_diffuse;
uniform vec3 u_lightDirection;

out vec4 outColor;

void main () {
  vec3 normal = normalize(v_normal);
  float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
  outColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
}
`;

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function rotate(m, angleInRadians, axis) {
  let x = axis[0], y = axis[1], z = axis[2];
  let len = Math.sqrt(x * x + y * y + z * z);
  if (len < 0.00001) {
    return null;
  }
  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  const s = Math.sin(angleInRadians);
  const c = Math.cos(angleInRadians);
  const t = 1 - c;
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
  const b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
  const b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;
  m[0] = a00 * b00 + a10 * b01 + a20 * b02;
  m[1] = a01 * b00 + a11 * b01 + a21 * b02;
  m[2] = a02 * b00 + a12 * b01 + a22 * b02;
  m[3] = a03 * b00 + a13 * b01 + a23 * b02;
  m[4] = a00 * b10 + a10 * b11 + a20 * b12;
  m[5] = a01 * b10 + a11 * b11 + a21 * b12;
  m[6] = a02 * b10 + a12 * b11 + a22 * b12;
  m[7] = a03 * b10 + a13 * b11 + a23 * b12;
  m[8] = a00 * b20 + a10 * b21 + a20 * b22;
  m[9] = a01 * b20 + a11 * b21 + a21 * b22;
  m[10] = a02 * b20 + a12 * b21 + a22 * b22;
  m[11] = a03 * b20 + a13 * b21 + a23 * b22;
  return m;
}

async function loadOBJ(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }
    const text = await response.text();
    return parseOBJ(text);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function setClearColor(gl, color) {
  gl.clearColor(color[0], color[1], color[2], color[3]);
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return;

  
  setClearColor(gl, [0.53, 0.81, 0.92, 1]);

  // Tell the twgl to match position with a_position etc..
  twgl.setAttributePrefix("a_");

  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  const cubeData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/cube.obj');
  const treeData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/Lowpoly_tree_sample.obj');
  const houseData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/medieval_house.obj');
  const tractorData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/Tractor.obj');
  const cactusData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/10436_Cactus_v1_max2010_it2.obj');
  const bushData = await loadOBJ('https://raw.githubusercontent.com/GReginatto/CG2024-1/main/models/bush01.obj');

  if (!cubeData || !treeData || !houseData || !tractorData || !cactusData || !bushData) {
    console.error("Failed to load one or more OBJ files.");
    return;
  }

  const cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeData);
  const cubeVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, cubeBufferInfo);

  const treeBufferInfo = twgl.createBufferInfoFromArrays(gl, treeData);
  const treeVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, treeBufferInfo);

  const houseBufferInfo = twgl.createBufferInfoFromArrays(gl, houseData);
  const houseVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, houseBufferInfo);

  const tractorBufferInfo = twgl.createBufferInfoFromArrays(gl, tractorData);
  const tractorVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, tractorBufferInfo);

  const cactusBufferInfo = twgl.createBufferInfoFromArrays(gl, cactusData);
  const cactusVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, cactusBufferInfo);

  const bushBufferInfo = twgl.createBufferInfoFromArrays(gl, bushData);
  const bushVAO = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bushBufferInfo);

  const cameraTarget = [0, 0, 0];
  const cameraPosition = [0, 10, 50];
  const zNear = 0.1;
  const zFar = 200;

  const grassSize = 90; 
  let cubes = [];
  let trees = [];
  let houses = [];
  let tractors = [];
  let cactuses = [];
  let bushes = [];
  let seasonColor = [0.2, 0.8, 0.2, 1]; 
  let groundColor = [0.1, 0.4, 0.1, 1]; 
  let density = 1; 
  let houseDensity = 1; 
  let cactusDensity = 1; 
  let isWinterOrSpring = false; 
  let isWinter = false;
  let isDesert = false; 

  function createCubes() {
    for (let x = -grassSize; x <= grassSize; x += 2) {
      const z = -grassSize;
      cubes.push({ x, y: 0, z });
    }
  }

  function createTrees() {
    if (isDesert) return;
    const distance = density === 1 ? 33 : density === 2 ? 30 : 25;
    const treeCount = Math.floor(cubes.length / (density === 1 ? 4 : density === 2 ? 3 : 2));
    for (let i = 0; i < treeCount; i++) {
      const index = Math.floor(Math.random() * cubes.length);
      const cube = cubes[index];
      const xOffset = (Math.random() - 0.5) * 2; 
      const zOffset = (Math.random() - 0.5) * 2; 
      const scale = isWinter ? (Math.random() * 0.5 + 1.0) : (Math.random() * 0.5 + 0.5); 
      const newTree = { x: cube.x + xOffset, y: 2, z: cube.z + zOffset, scale };

      
      if (trees.every(tree => Math.hypot(tree.x - newTree.x, tree.z - newTree.z) >= distance)) {
        trees.push(newTree);
      }
    }
  }

  function createCactuses() {
    if (!isDesert) return;
    const distance = cactusDensity === 1 ? 50 : cactusDensity === 2 ? 35 : 20;
    const cactusCount = Math.floor(cubes.length / (cactusDensity === 1 ? 4 : cactusDensity === 2 ? 3 : 2));
    for (let i = 0; i < cactusCount; i++) {
      const index = Math.floor(Math.random() * cubes.length);
      const cube = cubes[index];
      const xOffset = (Math.random() - 0.5) * 2; 
      const zOffset = (Math.random() - 0.5) * 2; 
      const scale = Math.random() * 0.03 + 0.02; 
      const newCactus = { x: cube.x + xOffset, y: 0.5, z: cube.z + zOffset, scale };

      
      if (cactuses.every(cactus => Math.hypot(cactus.x - newCactus.x, cactus.z - newCactus.z) >= distance)) {
        cactuses.push(newCactus);
      }
    }
  }

  function createBushes() {
    if (isWinterOrSpring || isDesert) return;
    const distance = 40;
    const bushCount = Math.floor(cubes.length / 8); 
    for (let i = 0; i < bushCount; i++) {
      const index = Math.floor(Math.random() * cubes.length);
      const cube = cubes[index];
      const xOffset = (Math.random() - 0.5) * 2; 
      const zOffset = (Math.random() - 0.5) * 2; 
      const scale = Math.random() * 0.03 + 0.02; 
      const newBush = { x: cube.x + xOffset, y: 0.5, z: cube.z + zOffset, scale };

      // Ensure minimum distance between bushes based on density
      if (bushes.every(bush => Math.hypot(bush.x - newBush.x, bush.z - newBush.z) >= distance)) {
        bushes.push(newBush);
        // Random chance to add 1 or 2 more bushes close to the first one
        const groupSize = Math.floor(Math.random() * 5);
        for (let j = 0; j < groupSize; j++) {
          const groupXOffset = (Math.random() - 0.5) * 2;
          const groupZOffset = (Math.random() - 0.5) * 2;
          const groupScale = Math.random() * 0.03 + 0.02;
          const groupedBush = { x: newBush.x + groupXOffset, y: 0.5, z: newBush.z + groupZOffset, scale: groupScale };
          if (bushes.every(bush => Math.hypot(bush.x - groupedBush.x, bush.z - groupedBush.z) >= distance)) {
            bushes.push(groupedBush);
          }
        }
      }
    }
  }

  function createHousesAndTractors() {
    if (isDesert) return;
    const houseDistance = houseDensity === 1 ? 50 : 35;
    const houseProbability = houseDensity === 1 ? 0.03 : 0.06; 

    const houseCount = Math.floor(cubes.length * houseProbability);
    for (let i = 0; i < houseCount; i++) {
      if (Math.random() > houseProbability) continue;
      const index = Math.floor(Math.random() * cubes.length);
      const cube = cubes[index];
      const xOffset = (Math.random() - 0.5) * 2; 
      const zOffset = (Math.random() - 0.5) * 2; 
      const newHouse = { x: cube.x + xOffset, y: 1.0, z: cube.z + zOffset };

    
      if (
        houses.every(house => Math.hypot(house.x - newHouse.x, house.z - newHouse.z) >= houseDistance) &&
        trees.every(tree => Math.hypot(tree.x - newHouse.x, tree.z - newHouse.z) >= 20)
      ) {
        houses.push(newHouse);

       
        trees = trees.filter(tree => Math.hypot(tree.x - newHouse.x, tree.z - newHouse.z) >= houseDistance);

      
        if (Math.random() > 0.5) {
          const tractorOffset = Math.random() > 0.5 ? 5 : -5;
          const newTractor = { x: newHouse.x + tractorOffset, y: 3.0, z: newHouse.z };
          tractors.push(newTractor);
        }
      }
    }
  }

  function moveObjects() {
    cubes.forEach(cube => {
      cube.z += 1.5;
    });
    trees.forEach(tree => {
      tree.z += 1.5; 
    });
    houses.forEach(house => {
      house.z += 1.5; 
    });
    tractors.forEach(tractor => {
      tractor.z += 1.5; 
    });
    cactuses.forEach(cactus => {
      cactus.z += 1.5; 
    });
    bushes.forEach(bush => {
      bush.z += 1.5; 
    });

    // Remove objects that have moved past the camera
    cubes = cubes.filter(cube => cube.z < cameraPosition[2]);
    trees = trees.filter(tree => tree.z < cameraPosition[2]);
    houses = houses.filter(house => house.z < cameraPosition[2]);
    tractors = tractors.filter(tractor => tractor.z < cameraPosition[2]);
    cactuses = cactuses.filter(cactus => cactus.z < cameraPosition[2]);
    bushes = bushes.filter(bush => bush.z < cameraPosition[2]);
  }

  function drawScene(time) {
    moveObjects();
    if (cubes.length === 0 || cubes[cubes.length - 1].z > -grassSize + 2) {
      createCubes();
      createTrees();
      createHousesAndTractors();
      createCactuses();
      createBushes();
    }

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = degToRad(45);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, [0, 1, 0]);
    const view = m4.inverse(cameraMatrix);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    // Draw the grass cubes
    gl.bindVertexArray(cubeVAO);
    for (let i = 0; i < cubes.length; ++i) {
      const worldMatrix = m4.translate(m4.identity(), cubes[i].x, cubes[i].y, cubes[i].z);
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: groundColor, 
      });
      twgl.drawBufferInfo(gl, cubeBufferInfo);
    }

    // Draw the trees
    gl.bindVertexArray(treeVAO);
    const trunkVertexCount = 36; 
    for (let i = 0; i < trees.length; ++i) {
      const worldMatrix = m4.translate(m4.identity(), trees[i].x, trees[i].y, trees[i].z);

      // Draw trunk
      const trunkColor = [0.55, 0.27, 0.07, 1];
      gl.useProgram(meshProgramInfo.program);
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: trunkColor,
      });
      twgl.drawBufferInfo(gl, treeBufferInfo, gl.TRIANGLES, trunkVertexCount, 0);

      // Draw leaves
      const scaleMatrix = m4.scale(m4.identity(), trees[i].scale, trees[i].scale, trees[i].scale); // Apply scaling to leaves
      const finalMatrix = m4.multiply(worldMatrix, scaleMatrix); // Combine translation and scaling
      twgl.setUniforms(meshProgramInfo, {
        u_world: finalMatrix,
        u_diffuse: seasonColor, 
      });
      twgl.drawBufferInfo(gl, treeBufferInfo, gl.TRIANGLES, treeBufferInfo.numElements - trunkVertexCount, trunkVertexCount);
    }

    // Draw the houses
    gl.bindVertexArray(houseVAO);
    for (let i = 0; i < houses.length; ++i) {
      const worldMatrix = m4.scale(m4.translate(m4.identity(), houses[i].x, houses[i].y, houses[i].z), 0.8, 0.8, 0.8);
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: [0.54, 0.27, 0.07, 1], 
      });
      twgl.drawBufferInfo(gl, houseBufferInfo);
    }

    // Draw the tractors
    gl.bindVertexArray(tractorVAO);
    for (let i = 0; i < tractors.length; ++i) {
      const worldMatrix = m4.scale(m4.translate(m4.identity(), tractors[i].x, tractors[i].y, tractors[i].z), 0.05, 0.05, 0.05);
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: [1, 0, 0, 1],
      });
      twgl.drawBufferInfo(gl, tractorBufferInfo);
    }

    // Draw the cactuses
    gl.bindVertexArray(cactusVAO);
    for (let i = 0; i < cactuses.length; ++i) {
      let worldMatrix = m4.translate(m4.identity(), cactuses[i].x, cactuses[i].y, cactuses[i].z);
      worldMatrix = rotate(worldMatrix, degToRad(300), [1, 0, 0]); 
      worldMatrix = m4.scale(worldMatrix, cactuses[i].scale, cactuses[i].scale, cactuses[i].scale);
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: [0.2, 0.8, 0.2, 1],
      });
      twgl.drawBufferInfo(gl, cactusBufferInfo);
    }

    // Draw the bushes
    gl.bindVertexArray(bushVAO);
    for (let i = 0; i < bushes.length; ++i) {
      const worldMatrix = m4.scale(m4.translate(m4.identity(), bushes[i].x, bushes[i].y, bushes[i].z), 0.0095, 0.0035, 0.0095); 
      twgl.setUniforms(meshProgramInfo, {
        u_world: worldMatrix,
        u_diffuse: seasonColor, 
      });
      twgl.drawBufferInfo(gl, bushBufferInfo);
    }
    requestAnimationFrame(drawScene);
  }

  function changeSeason(leafColor, groundColorInput, isWinterOrSpringFlag, isWinterFlag) {
    seasonColor = leafColor;
    groundColor = groundColorInput;
    isWinterOrSpring = isWinterOrSpringFlag;
    isWinter = isWinterFlag;
    isDesert = false;
    trees = []; 
    houses = []; 
    tractors = []; 
    cactuses = []; 
    bushes = []; 
    createTrees(); 
    createHousesAndTractors(); 
    createBushes(); 
  }

  function changeToDesert() {
    seasonColor = [0.2, 0.8, 0.2, 1]; 
    groundColor = [0.94, 0.86, 0.51, 1]; 
    isDesert = true;
    trees = [];
    houses = []; 
    tractors = []; 
    cactuses = []; 
    bushes = []; 
    createCactuses(); 
  }

  document.getElementById("spring").addEventListener("click", () => changeSeason([1, 0.75, 0.79, 1], [0.9, 0.9, 0.6, 1], true, false)); 
  document.getElementById("summer").addEventListener("click", () => changeSeason([0.2, 0.8, 0.2, 1], [0.1, 0.4, 0.1, 1], false, false)); 
  document.getElementById("autumn").addEventListener("click", () => changeSeason([0.8, 0.2, 0.2, 1], [0.5, 0.3, 0.1, 1], false, false)); 
  document.getElementById("winter").addEventListener("click", () => changeSeason([0.8, 0.8, 0.8, 1], [0.8, 0.8, 0.8, 1], true, true));
  document.getElementById("desert").addEventListener("click", changeToDesert); // Desert button

  const densitySlider = document.getElementById("density");
  const densityValue = document.getElementById("densityValue");
  densitySlider.addEventListener("input", (event) => {
    density = parseInt(event.target.value);
    densityValue.textContent = density;
    trees = []; 
    createTrees(); 
  });

  const houseDensitySlider = document.getElementById("houseDensity");
  const houseDensityValue = document.getElementById("houseDensityValue");
  houseDensitySlider.addEventListener("input", (event) => {
    houseDensity = parseInt(event.target.value);
    houseDensityValue.textContent = houseDensity;
    houses = [];
    tractors = []; 
    createHousesAndTractors(); 
  });

  const cactusDensitySlider = document.getElementById("cactusDensity");
  const cactusDensityValue = document.getElementById("cactusDensityValue");
  cactusDensitySlider.addEventListener("input", (event) => {
    cactusDensity = parseInt(event.target.value);
    cactusDensityValue.textContent = cactusDensity;
    cactuses = []; 
    createCactuses(); 
  });

  drawScene();
}

main();
