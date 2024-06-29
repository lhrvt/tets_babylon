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

        // Create walls
        var wallHeight = 2;
        var wallThickness = 0.5;
        var wallLength = 50;
        var halfWallLength = wallLength / 2;

        var createWall = function(name, position, rotation) {
            var wall = BABYLON.MeshBuilder.CreateBox(name, {height: wallHeight, width: wallThickness, depth: wallLength}, scene);
            wall.position = position;
            wall.rotation = rotation;
            wall.isPickable = false;
            return wall;
        };

        var walls = [
            createWall("wall1", new BABYLON.Vector3(halfWallLength, wallHeight / 2, 0), new BABYLON.Vector3(0, 0, 0)),
            createWall("wall2", new BABYLON.Vector3(-halfWallLength, wallHeight / 2, 0), new BABYLON.Vector3(0, 0, 0)),
            createWall("wall3", new BABYLON.Vector3(0, wallHeight / 2, halfWallLength), new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(90), 0)),
            createWall("wall4", new BABYLON.Vector3(0, wallHeight / 2, -halfWallLength), new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(90), 0))
        ];

        // Function to import and setup the model with animations
        function importModel(modelName, onModelImported, index) {
            BABYLON.SceneLoader.ImportMesh(null, "./model/", modelName, scene, function (meshes, particleSystems, skeletons, animationGroups) {
                if (meshes.length > 0 && animationGroups.length >= 3) {
                    var model = meshes[0];
                    model.name = modelName + "_" + index;
                    model.position = new BABYLON.Vector3(0, 0, 0);
                    model.scaling = new BABYLON.Vector3(1, 1, 1);
                    model.rotationQuaternion = null;

                    // Create a bounding box collider for the model
                    var boundingBox = BABYLON.MeshBuilder.CreateBox(model.name + "_collider", {size: 1}, scene);
                    boundingBox.scaling = new BABYLON.Vector3(1, 1, 1);
                    boundingBox.position = model.position.clone();
                    boundingBox.visibility = 0;

                    // Parent the collider to the model
                    boundingBox.parent = model;
                    boundingBox.isPickable = false;

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
                this.isAttractedToCenter = false;

                this.switchToRun();
            }
        
            getRandomNumberBetween1And2() {
                return Math.random() < 0.5 ? 1 : 2;
            }
        
            switchToRun() {
                if (!this.isRunning) {
                    this.idleAnimation.stop();
                    this.runAnimation.start(true);
                    this.isRunning = true;
        
                    setTimeout(() => {
                        let randomValue = this.getRandomNumberBetween1And2();
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
                    this.runAnimation.stop();
                    this.idleAnimation.start(true);
                    this.isRunning = false;
        
                    setTimeout(() => {
                        let randomValue = this.getRandomNumberBetween1And2();
                        if (randomValue === 1) {
                            this.switchToRun();
                        } else {
                            this.isRunning = true;
                            this.switchToIdle();
                        }
                    }, 6000);
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

                if (this.isAttractedToCenter) {
                    let center = new BABYLON.Vector3(0, 0, 0);
                    let direction = center.subtract(this.model.position).normalize();
                    this.model.position.addInPlace(direction.scale(0.07));
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

                // Check for collisions with walls
                for (let wall of walls) {
                    if (this.collider.intersectsMesh(wall, false)) {
                        console.log("Collision detected between chicken and wall");
                        // Handle wall collision
                        this.handleWallCollision();
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
                    x: this.model.position.x + direction.x * 1.5, // Move backward in x direction
                    z: this.model.position.z + direction.z * 1.5, // Move backward in z direction
                    duration: 0.7,
                    ease: "power2.out" // Adjust easing function as needed
                });
            
                gsap.to(otherController.model.position, {
                    x: otherController.model.position.x - direction.x, // Move backward in x direction
                    z: otherController.model.position.z - direction.z, // Move backward in z direction
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

            handleWallCollision() {
                // Attract the model to the center
                this.isAttractedToCenter = true;
                this.runAnimation.stop();
                this.idleAnimation.stop();
                this.collisionAnimation.start(true);

                setTimeout(() => {
                    this.isAttractedToCenter = false;
                    this.collisionAnimation.stop();
                    this.switchToIdle();
                }, 1000); // Attract for 2 seconds
            }
        }

        function getRandomSpawnPosition(maxRange) {
            var x = Math.random() * maxRange * 2 - maxRange;
            var z = Math.random() * maxRange * 2 - maxRange;
            return new BABYLON.Vector3(x, 0, z);
        }
        
        let modelControllers = [];

        function setupScene() {
            scene.registerBeforeRender(function () {
                modelControllers.forEach(controller => controller.update());
            });
        
            function addModel(modelName, spawnPosition, index) {
                importModel(modelName, function (model, idleAnimation, runAnimation, collisionAnimation, collider) {
                    model.position = spawnPosition;
                    let modelController = new ModelController(model, idleAnimation, runAnimation, collisionAnimation, collider);
                    modelControllers.push(modelController);
                }, index);
            }
        
            // Import multiple models with different spawn positions
            const modelNames = ["poulet_blue.glb", "poulet_green.glb", "poulet_orange.glb", "poulet_pink.glb", "poulet_yellow.glb", "poulet_red.glb", "poulet_panda.glb","poulet_blue.glb", "poulet_green.glb", "poulet_orange.glb", "poulet_pink.glb", "poulet_yellow.glb", "poulet_red.glb", "poulet_panda.glb", "poulet_blue.glb", "poulet_green.glb", "poulet_orange.glb", "poulet_pink.glb", "poulet_yellow.glb", "poulet_red.glb", "poulet_panda.glb"    ];
            modelNames.forEach((modelName, index) => {
                addModel(modelName, getRandomSpawnPosition(10), index);
            });
        }
        
        setupScene();
        
        var pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline",
            true,
            scene,
            [camera]
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
