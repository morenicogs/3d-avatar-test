import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const divAvatarLoading = document.getElementById("avatar-loading")
const containerDiv = document.getElementById("avatar-container")

window.onload = () => loadModel()

function loadModel() {
	const loader = new GLTFLoader()

	loader.load("./public/nicogsAvatar.glb",
		(gltf) => {
			// loaded
			setupScene(gltf)
			divAvatarLoading.style.display = "none"
		},
		(xhr) => {
			// progress
			const completionPct = Math.round(xhr.loaded / xhr.total * 100)	
			divAvatarLoading.innerText = "⚙️ Loading Model... " + completionPct + "%"
		},
		(error) => {
			// error
			console.log(error)
		}
	)
}

function setupScene(gltf) { 
	const renderer = new THREE.WebGLRenderer(
		{
			antialias: true,
			alpha: true
		}
	)

	renderer.outputColorSpace = THREE.SRGBColorSpace

	renderer.setSize(containerDiv.clientWidth, containerDiv.clientHeight)
	renderer.setPixelRatio(window.devicePixelRatio)
	
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap

	containerDiv.appendChild(renderer.domElement)

	// camera setup
	const camera = new THREE.PerspectiveCamera(45,containerDiv.clientWidth / containerDiv.clientHeight)
	camera.position.set(0.2, 0.5, 1)

	// scene controls
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
	controls.enablePan = false
	controls.enableZoom = false
	controls.minDistance = 3
	controls.minPolarAngle = 1.4
	controls.maxPolarAngle = 1.4
	controls.target = new THREE.Vector3(0, 0.75, 0)
	controls.update();

	// scene setup
	const scene = new THREE.Scene()

	// Lightning setup
	scene.add(new THREE.AmbientLight())
	
	const spotlight = new THREE.SpotLight(0xffffff, 20, 8, 1)
	spotlight.penumbra = 0.5
	spotlight.position.set(0, 4, 2)
	spotlight.castShadow = true
	scene.add(spotlight)

	const keylight = new THREE.DirectionalLight(0xffffff, 2)
	keylight.position.set(1,1,2)
	keylight.lookAt(new THREE.Vector3())
	scene.add(keylight)

	// Load Avatar
	const avatar = gltf.scene
	avatar.traverse((child) => {
		if(child.isMesh) {
			child.castShadow = true
			child.receiveShadow = true
		}
	})

	scene.add(avatar)

	// Create Podium
	const podiumGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 64)
	const podiumMaterial = new THREE.MeshStandardMaterial()
	
	const podiumMesh = new THREE.Mesh(podiumGeometry, podiumMaterial)
	podiumMesh.castShadow = false;
	podiumMesh.receiveShadow = true;
	podiumMesh.position.y -= 0.05
	scene.add(podiumMesh)

	// load animations
	const mixer = new THREE.AnimationMixer(avatar)
	const clips = gltf.animations
	const idleClip = THREE.AnimationClip.findByName(clips, "idle")
	const confusedClip = THREE.AnimationClip.findByName(clips, "Confused")

	const idleAction = mixer.clipAction(idleClip)
	const confusedAction = mixer.clipAction(confusedClip)

	let isConfused = false

	const raycaster = new THREE.Raycaster()

	containerDiv.addEventListener("mousedown", (ev) => {
		const coords = {
			x: (ev.offsetX / containerDiv.clientWidth) * 2 -1,
			y: -(ev.offsetY / containerDiv.clientHeight) * 2 + 1
		}

		raycaster.setFromCamera(coords, camera)
		
		const intersections = raycaster.intersectObject(avatar)

		if(intersections.length > 0) {
			if(isConfused) return

			isConfused = true
			confusedAction.reset()
			confusedAction.play()
			idleAction.crossFadeTo(confusedAction, 0.3)

			setTimeout(() => {
				// isConfused = false
				idleAction.reset()
				idleAction.play()
				confusedAction.crossFadeTo(idleAction, 1)
				setTimeout(() => isConfused = false, 1000)
			}, 4000)
		}
	})
	
	const clock = new THREE.Clock()
	function animate() {
		requestAnimationFrame(animate)
		mixer.update(clock.getDelta())
		renderer.render(scene, camera)
	}

	animate()
	idleAction.play()
}