window.addEventListener('DOMContentLoaded', function() {

    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true);
   

    var createScene = function() {
        var scene = new BABYLON.Scene(engine);

        var camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(70), 8, new BABYLON.Vector3(0, 1, 0), scene);
        camera.inputs.clear();

        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
        light.intensity = 0.4;

        var bloom = new BABYLON.GlowLayer("bloom", scene);
        bloom.intensity = 0.1; 

        var size = 1;
        var gap = 0.2;
        var cubes = [];
        var alpha = new BABYLON.StandardMaterial("material", scene);
        alpha.alpha = 0; 

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var cube = BABYLON.MeshBuilder.CreateBox("cube_" + i + "_" + j, { size: size }, scene);
                cube.position.x = i * (size + gap);
                cube.position.z = j * (size + gap);
                cube.position.y = 1;
                cube.material = alpha;
                cubes.push(cube);
            }
        }

        var offset = (3 - 1) * (size + gap) / 2;
        cubes.forEach(function(cube) {
            cube.position.x -= offset;
            cube.position.z -= offset;
        });

        function addHoverActions(mesh) {
            mesh.actionManager = new BABYLON.ActionManager(scene);
            mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    function (event) {
                        gsap.to(mesh.position, { y: 1.5, duration: 0.5, ease: "power2.out" });
                    }
                )
            );
            mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    function (event) {
                        gsap.to(mesh.position, { y: 1.0, duration: 0.5, ease: "power2.out" });
                    }
                )
            );
        }

        cubes.forEach(addHoverActions);

        function importAndSetupModel(modelName, parentCube, position, scaling, rotation) {
            BABYLON.SceneLoader.ImportMesh(null, "./model/", modelName, scene, function (meshes, particleSystems, skeletons, animationGroups) {
                if (meshes.length > 0) {
                    var model = meshes[0];
                    model.parent = parentCube;
                    model.position = position;
                    model.scaling = scaling;
                    model.rotation = rotation;
        
                    var animations = [];
                    animationGroups.forEach(function(animationGroup, index) {
                        animations[index] = animationGroup;
                    });
                } else {
                    console.error("Aucun mesh n'a été trouvé dans le modèle " + modelName);
                }
            });
        }

        var position = new BABYLON.Vector3(-0.05, -1.7, -0.9);
        var position2 = new BABYLON.Vector3(-0.05, -2.68, 0);
        var scaling = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        var rotation = new BABYLON.Vector3(0, -Math.PI / 2, Math.PI);

        importAndSetupModel("A1.glb", cubes.find(c => c.name === "cube_2_2"), position, scaling, rotation);
        importAndSetupModel("A2.glb", cubes.find(c => c.name === "cube_1_2"), position, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_0_2"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_0_1"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_0_0"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_1_0"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_2_0"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_2_1"), position2, scaling, rotation);
        importAndSetupModel("A3.glb", cubes.find(c => c.name === "cube_1_1"), position2, scaling, rotation);

        // Add HDR effects using DefaultRenderingPipeline
        var pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline", // The name of the pipeline
            true, // Do you want HDR?
            scene, // The scene instance
            [camera] // The list of cameras to be attached to
        );

        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.7;
        pipeline.bloomWeight = 0.1;
        pipeline.bloomKernel = 256;
        pipeline.bloomScale = 0.9;

        pipeline.imageProcessingEnabled = true;
        pipeline.imageProcessing.contrast = 1.2;
        pipeline.imageProcessing.exposure = 1.0;
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        pipeline.imageProcessing.colorGradingEnabled = false;

        var hdrTexture = new BABYLON.HDRCubeTexture("hdr_night.hdr", scene, 512);
        scene.environmentTexture = hdrTexture;

        

        scene.clearColor = new BABYLON.Color4(0.12, 0.1, 0.15, 1);
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
