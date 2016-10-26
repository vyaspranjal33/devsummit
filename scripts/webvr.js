;;(function() {
  function transitionEndPromise (elem) {
    return new Promise(function (resolve) {
      elem.addEventListener('transitionend', function h() {
        elem.removeEventListener('transitionend', h);
        resolve();
      });
    });
  }

  function rafPromise () {
    return new Promise(function (resolve) {
      requestAnimationFrame(resolve);
    });
  }

  const _masthead = document.querySelector('.masthead');
  let renderer;
  _masthead.classList.add('animatable', 'hide-areas');
  transitionEndPromise(_masthead)
    .then(function () {
      // Remove all contents of the masthead
      while (_masthead.firstChild) {
        _masthead.removeChild(_masthead.firstChild);
      }

      renderer = new THREE.WebGLRenderer({antialias: false});
      renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
      // Append the canvas element created by the renderer to document body element.
      renderer.domElement.classList.add('masthead__graphic', 'masthead__vr');
      _masthead.appendChild(renderer.domElement, _masthead.querySelector('.masthead__graphic'));
    })
    .then(rafPromise)
    .then(rafPromise)
    .then(function () {
      _masthead.classList.remove('hide-areas');
      return transitionEndPromise(_masthead);
    })
    .then(function () {
      var rect = renderer.domElement.getBoundingClientRect();
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 10000);
      var controls = new THREE.VRControls(camera);
      // Apply VR stereo rendering to renderer.
      var effect = new THREE.VREffect(renderer);
      effect.setSize(rect.width, rect.height);
      // Add a repeating grid as a skybox.
      var boxWidth = 5;
      var loader = new THREE.TextureLoader();
      loader.load('/devsummit/static/images/vr/uv_4k.jpg', onTextureLoaded);

      // Get the VRDisplay and save it for later.
      var vrDisplay = null;
      navigator.getVRDisplays().then(function(displays) {
        if (displays.length > 0) {
          vrDisplay = displays[0];
          // Kick off the render loop.
          vrDisplay.requestAnimationFrame(animate);
        }
      });
      function onTextureLoaded(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(boxWidth, boxWidth);
        var geometry = new THREE.BoxGeometry(boxWidth, boxWidth, boxWidth);
        var material = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0x01BE00,
          side: THREE.BackSide
        });
        var skybox = new THREE.Mesh(geometry, material);
        scene.add(skybox);
      }
      // Create 3D objects.
      var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      var material = new THREE.MeshNormalMaterial();
      var cube = new THREE.Mesh(geometry, material);
      // Position cube mesh
      cube.position.z = -1;
      // Add cube mesh to your three.js scene
      scene.add(cube);
      // Request animation frame loop function
      var lastRender = 0;
      function animate(timestamp) {
        var delta = Math.min(timestamp - lastRender, 500);
        lastRender = timestamp;
        // Apply rotation to cube mesh
        cube.rotation.y += delta * 0.0006;
        // Update VR headset position and apply to camera.
        controls.update();
        // Render the scene.
        effect.render(scene, camera);
        // Keep looping.
        vrDisplay.requestAnimationFrame(animate);
      }
      function onResize() {
        rect = renderer.domElement.getBoundingClientRect();
        effect.setSize(rect.width, rect.height);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      }
      function onVRDisplayPresentChange() {
        onResize();
      }
      // Resize the WebGL canvas when we resize and also when we change modes.
      window.addEventListener('resize', onResize);
      window.addEventListener('vrdisplaypresentchange', onVRDisplayPresentChange);
      // Button click handlers.
      // document.querySelector('button#fullscreen').addEventListener('click', function() {
      //   enterFullscreen(renderer.domElement);
      // });
      // document.querySelector('button#vr').addEventListener('click', function() {
      //   vrDisplay.requestPresent([{source: renderer.domElement}]);
      // });
      // document.querySelector('button#reset').addEventListener('click', function() {
      //   vrDisplay.resetPose();
      // });
      function enterFullscreen (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
      }
    });
})();
