let scene, camera, renderer, controls;
let panorama, hotspots = [];
const modal = document.getElementById('modal');
const modalText = document.getElementById('modal-text');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const loadingScreen = document.getElementById('loading-screen');

let autoRotate = true;
let autoRotateSpeed = 0.2;
let lastInteractionTime = Date.now();
const interactionTimeout = 3000;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let isPhone = window.innerWidth <= 480;
let isLandscape = window.innerWidth > window.innerHeight;

function init() {
    scene = new THREE.Scene();

    const fov = isPhone ? 90 : 75;
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('viewer').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = isPhone ? -0.2 : (isMobile ? -0.3 : -0.5);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.autoRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = isPhone ? 0.1 : 0.05;
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };

    if (isPhone) {
        controls.minDistance = 0.1;
        controls.maxDistance = 0.1;
        controls.target.set(0, 0, 0);
    }

    controls.addEventListener('start', () => {
        lastInteractionTime = Date.now();
        autoRotate = false;
    });

    controls.addEventListener('end', () => {
        lastInteractionTime = Date.now();
    });

    loadPanorama('drive-download-20250424T172009Z-001/1.jpg');

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onOrientationChange);
    
    document.querySelectorAll('.scene-box').forEach(box => {
        box.addEventListener('click', () => {
            const scenePath = box.getAttribute('data-scene');
            loadPanorama('drive-download-20250424T172009Z-001/' + scenePath);
            
            document.querySelectorAll('.scene-box').forEach(b => b.classList.remove('active'));
            box.classList.add('active');
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('zoom-in').addEventListener('click', () => zoom(1.1));
    document.getElementById('zoom-out').addEventListener('click', () => zoom(0.9));

    if (isMobile) {
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    preventPullToRefresh();
    preventDoubleTapZoom();
}

function preventDoubleTapZoom() {
    let lastTap = 0;
    document.addEventListener('touchend', function(event) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            event.preventDefault();
        }
        lastTap = currentTime;
    });
}

function preventPullToRefresh() {
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const touchDiff = touchY - touchStartY;
        
        if (touchDiff > 0 && window.scrollY === 0) {
            e.preventDefault();
        }
    }, { passive: false });
}

function handleTouchStart(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}

function handleTouchMove(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}

function onOrientationChange() {
    isLandscape = window.innerWidth > window.innerHeight;
    isPhone = window.innerWidth <= 480;
    onWindowResize();
}

function loadPanorama(imagePath) {
    loadingScreen.style.display = 'flex';
    
    if (panorama) {
        scene.remove(panorama);
    }
    hotspots.forEach(hotspot => scene.remove(hotspot));
    hotspots = [];

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        imagePath,
        function(texture) {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            panorama = new THREE.Mesh(geometry, material);
            scene.add(panorama);

            if (isPhone) {
                panorama.position.set(0, 0, 0);
            }

            addHotspot(0, 0, 'Center Point', 'This is the center of the panorama');
            addHotspot(Math.PI / 4, 0, 'Right Side', 'Looking towards the right side');
            addHotspot(-Math.PI / 4, 0, 'Left Side', 'Looking towards the left side');
            
            loadingScreen.style.display = 'none';
        },
        undefined,
        function(err) {
            console.error('Error loading texture:', err);
            alert('Error loading panorama image. Please check the console for details.');
            loadingScreen.style.display = 'none';
        }
    );
}

function addHotspot(longitude, latitude, title, text) {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const hotspot = new THREE.Mesh(geometry, material);

    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);
    const x = -(500 * Math.sin(phi) * Math.cos(theta));
    const y = 500 * Math.cos(phi);
    const z = 500 * Math.sin(phi) * Math.sin(theta);

    hotspot.position.set(x, y, z);
    hotspot.userData = { title, text };
    hotspot.lookAt(0, 0, 0);
    scene.add(hotspot);
    hotspots.push(hotspot);

    hotspot.userData.onClick = () => {
        modalTitle.textContent = title;
        modalText.textContent = text;
        modal.style.display = 'block';
    };
}

function onWindowResize() {
    isPhone = window.innerWidth <= 480;
    isLandscape = window.innerWidth > window.innerHeight;
    
    const fov = isPhone ? 90 : 75;
    camera.fov = fov;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    controls.rotateSpeed = isPhone ? -0.2 : (isMobile ? -0.3 : -0.5);
    controls.dampingFactor = isPhone ? 0.1 : 0.05;
}

function animate() {
    requestAnimationFrame(animate);
    
    if (Date.now() - lastInteractionTime > interactionTimeout) {
        autoRotate = true;
    }

    if (autoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = autoRotateSpeed;
    } else {
        controls.autoRotate = false;
    }

    controls.update();
    renderer.render(scene, camera);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const hotspot = intersects[0].object;
        if (hotspot.userData.onClick) {
            hotspot.userData.onClick();
        }
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function resetView() {
    camera.position.set(0, 0, 0.1);
    controls.reset();
    lastInteractionTime = Date.now();
    autoRotate = false;
}

function zoom(factor) {
    const fov = camera.fov / factor;
    camera.fov = THREE.MathUtils.clamp(fov, 30, 90);
    camera.updateProjectionMatrix();
    lastInteractionTime = Date.now();
    autoRotate = false;
}

window.addEventListener('click', onMouseClick);

init();
animate(); 