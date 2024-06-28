window.addEventListener('DOMContentLoaded', function() {

    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function() {
        var scene = new BABYLON.Scene(engine);

        // Create camera
        var camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(70), 8, new BABYLON.Vector3(0, 1, 0), scene);
        camera.attachControl(canvas, true);

        // Create light
        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
        light.intensity = 0.7;

        // Create ground
        var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene);
        ground.position.y = -0.05;

        // Function to import and setup the model with animations
        function importModel(modelName, onModelImported, index) {
            BABYLON.SceneLoader.ImportMesh(null, "./model/", modelName, scene, function (meshes, particleSystems, skeletons, animationGroups) {
                if (meshes.length > 0 && animationGroups.length >= 3) { // Update to 3 if we have 3 animations now
                    var model = meshes[0];
                    model.name = modelName + "_" + index;
                    model.position = new BABYLON.Vector3(0, 0, 0);
                    model.scaling = new BABYLON.Vector3(1, 1, 1);
                    model.rotationQuaternion = null; // Disable quaternion rotation

                    // Create a bounding box collider for the model
                    var boundingBox = BABYLON.MeshBuilder.CreateBox(model.name + "_collider", {size: 1}, scene);
                    boundingBox.scaling = new BABYLON.Vector3(1, 1, 1); // Adjust the size as needed
                    boundingBox.position = model.position.clone();
                    boundingBox.visibility = 0; // Make the collider invisible

                    // Parent the collider to the model
                    boundingBox.parent = model;
                    boundingBox.isPickable = false; // Make sure the collider itself is not pickable
                    
                    // Call the callback function with the imported model, animations, and collider
                    onModelImported(model, animationGroups[0], animationGroups[1], animationGroups[2], boundingBox);
                } else {
                    console.error("Model or animations not found in " + modelName);
                }
            });
        }
        
        class ModelController {
            constructor(model, idleAnimation, runAnimation, collisionAnimation, collider) {
                this.model = model;
                this.idleAnimation = idleAnimation;
                this.runAnimation = runAnimation;
                this.collisionAnimation = collisionAnimation;
                this.collider = collider;
                this.isRunning = false;
        
                this.switchToRun();
            }
        
            getRandomNumberBetween1And2() {
                return Math.random() < 0.5 ? 1 : 2;
            }
        
            switchToRun() {
                if (!this.isRunning) {
                    console.log("running");
                    this.idleAnimation.stop();
                    this.runAnimation.start(true);
                    this.isRunning = true;
        
                    setTimeout(() => {
                        let randomValue = this.getRandomNumberBetween1And2();
                        console.log("Random value:", randomValue);
                        if (randomValue === 1) {
                            this.switchToIdle();
                        } else {
                            this.isRunning = false;
                            this.switchToRun();
                        }
                    }, 3000 + Math.random() * 1000 * 2 - 1000);
                }
            }
        
            switchToIdle() {
                if (this.isRunning) {
                    console.log("idle");
                    this.runAnimation.stop();
                    this.idleAnimation.start(true);
                    this.isRunning = false;
        
                    setTimeout(() => {
                        let randomValue = this.getRandomNumberBetween1And2();
                        console.log("Random value:", randomValue);
                        if (randomValue === 1) {
                            this.switchToRun();
                        } else {
                            this.isRunning = true;
                            this.switchToIdle();
                        }
                    }, 6000 );
                }
            }
        
            update() {
                if (this.isRunning) {
                    var forward = new BABYLON.Vector3(1, 0, 0);
                    forward = BABYLON.Vector3.TransformNormal(forward, this.model.getWorldMatrix());
                    forward.y = 0;
                    forward.normalize();
                    this.model.position.addInPlace(forward.scale(0.05));
        
                    if (Math.random() < 0.05) {
                        var randomAngle = (Math.random() - 0.5) * Math.PI;
                        gsap.to(this.model.rotation, { y: this.model.rotation.y + randomAngle, duration: 0.5 });
                    }

                    this.detectCollisions();
                }
            }

            detectCollisions() {
                for (let otherController of modelControllers) {
                    if (otherController !== this) {
                        if (this.collider.intersectsMesh(otherController.collider, false)) {
                            // Extract the color from the model name
                            let thisColor = this.model.name.split('_')[1];
                            let otherColor = otherController.model.name.split('_')[1];
                            console.log("Collision detected between", thisColor, "and", otherColor);
                            // Handle collision
                            this.handleCollision(otherController);
                        }
                    }
                }
            }
            
            handleCollision(otherController) {
                // Switch to collision animation for both models
                this.runAnimation.stop();
                this.collisionAnimation.start(true);
                otherController.runAnimation.stop();
                otherController.collisionAnimation.start(true);
            
                // Calculate the direction opposite to the collision
                let direction = this.model.position.subtract(otherController.model.position).normalize();
            
                // Use GSAP to animate the models
                gsap.to(this.model.position, {
                    x: this.model.position.x + direction.x *1.5 , // Move backward in x direction
                    z: this.model.position.z + direction.z  *1.5, // Move backward in z direction
                    duration: 0.7,
                    ease: "power2.out" // Adjust easing function as needed
                });
            
                gsap.to(otherController.model.position, {
                    x: otherController.model.position.x + -direction.x  , // Move backward in x direction
                    z: otherController.model.position.z + -direction.z  , // Move backward in z direction
                    duration: 0.7,
                    ease: "power2.out" // Adjust easing function as needed
                });
            
                // Rotate the models
                gsap.to(this.model.rotation, {
                    y: this.model.rotation.y + Math.PI / 2, // Rotate approximately 80 degrees (Math.PI / 2 radians)
                    duration: 0.5,
                    ease: "power2.out" // Adjust easing function as needed
                });
            
                gsap.to(otherController.model.rotation, {
                    y: otherController.model.rotation.y - Math.PI / 6, // Rotate approximately -80 degrees (Math.PI / 2 radians)
                    duration: 0.5,
                    ease: "power2.out", // Adjust easing function as needed
                    onComplete: () => {
                        // After animation completes, switch back to idle state
                        this.collisionAnimation.stop();
                        this.switchToIdle();
                        otherController.collisionAnimation.stop();
                        otherController.switchToIdle();
                    }
                });
            }
        }

        function getRandomSpawnPosition(maxRange) {
            var x = Math.random() * maxRange * 2 - maxRange; // Random number between -maxRange and maxRange
            var z = Math.random() * maxRange * 2 - maxRange; // Random number between -maxRange and maxRange
            return new BABYLON.Vector3(x, 0, z);
        }
        
        let modelControllers = [];

        function setupScene() {
            scene.registerBeforeRender(function () {
                modelControllers.forEach(controller => controller.update());
            });
        
            function addModel(modelName, spawnPosition, index) {
                importModel(modelName, function (model, idleAnimation, runAnimation, collisionAnimation, collider) {
                    model.position = spawnPosition; // Set the spawn position
                    let modelController = new ModelController(model, idleAnimation, runAnimation, collisionAnimation, collider);
                    modelControllers.push(modelController);
                }, index);
            }
        
            // Import multiple models with different spawn positions
            const modelNames = ["poulet_orange.glb", "poulet_orange.glb", "poulet_orange.glb", "poulet_orange.glb", "poulet_orange.glb","poulet_orange.glb", "poulet_orange.glb", "poulet_orange.glb"];
            modelNames.forEach((modelName, index) => {
                addModel(modelName, getRandomSpawnPosition(10), index);
            });
        }
        
        // Setup the scene and import models
        setupScene();
        
        var pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline", // The name of the pipeline
            true, // Do you want HDR?
            scene, // The scene instance
            [camera] // The list of cameras to be attached to
        );

        var hdrTexture = new BABYLON.HDRCubeTexture("garden.hdr", scene, 256);
        scene.environmentTexture = hdrTexture;

        return scene;
    };

    var scene = createScene();

    engine.runRenderLoop(function() {
        scene.render();
    });

    window.addEventListener('resize', function() {
        engine.resize();
    });

    // scene.debugLayer.show();
});
