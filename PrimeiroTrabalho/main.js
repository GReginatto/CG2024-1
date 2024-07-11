function main() {
  const canvas = document.getElementById('glCanvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
      console.error('WebGL2 not supported');
      return;
  }

  // Shader sources
  const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec3 aVertexNormal;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      varying highp vec3 vLighting;
      void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
          vLighting = aVertexNormal;
      }
  `;

  const fsSource = `
      varying highp vec3 vLighting;
      void main(void) {
          gl_FragColor = vec4(vLighting, 1.0);
      }
  `;

  // Initialize a shader program
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect shader program info
  const programInfo = {
      program: shaderProgram,
      attribLocations: {
          vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
          vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      },
      uniformLocations: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      },
  };

  document.getElementById('loadModel').addEventListener('click', function() {
      loadOBJModel('trator.obj', gl, programInfo);
  });
}

function loadOBJModel(url, gl, programInfo) {
  fetch(url)
      .then(response => response.text())
      .then(data => {
          console.log('OBJ data loaded successfully:', data);
          const { vertices, normals, indices } = parseOBJ(data);
          const buffers = initBuffers(gl, vertices, normals, indices);
          drawScene(gl, programInfo, buffers);
      })
      .catch(error => console.error('Error loading OBJ file:', error));
}

function parseOBJ(data) {
  const lines = data.split('\n');
  const vertices = [];
  const normals = [];
  const indices = [];

  lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      switch (parts[0]) {
          case 'v':
              vertices.push(
                  parseFloat(parts[1]) * 0.01,  // Convert centimeters to meters
                  parseFloat(parts[2]) * 0.01,
                  parseFloat(parts[3]) * 0.01
              );
              break;
          case 'vn':
              normals.push(
                  parseFloat(parts[1]),
                  parseFloat(parts[2]),
                  parseFloat(parts[3])
              );
              break;
          case 'f':
              for (let i = 1; i < parts.length; i++) {
                  const vertex = parts[i].split('//');
                  indices.push(parseInt(vertex[0]) - 1);
              }
              break;
          default:
              // Other lines can be ignored for now
              break;
      }
  });

  console.log('Parsed vertices:', vertices);
  console.log('Parsed normals:', normals);
  console.log('Parsed indices:', indices);

  return { vertices, normals, indices };
}

function initBuffers(gl, vertices, normals, indices) {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
      vertex: vertexBuffer,
      normal: normalBuffer,
      indices: indexBuffer,
      vertexCount: indices.length,
  };
}

function drawScene(gl, programInfo, buffers) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix,
                 modelViewMatrix,
                 [-0.0, 0.0, -6.0]);

  {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexPosition);
  }

  {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexNormal,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexNormal);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  gl.useProgram(programInfo.program);

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

  {
      const vertexCount = buffers.vertexCount;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
  }

  return shader;
}

document.addEventListener('DOMContentLoaded', main);
