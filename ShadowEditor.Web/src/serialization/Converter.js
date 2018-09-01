import BaseSerializer from './BaseSerializer';

// core
import Object3DSerializer from './core/Object3DSerializer';
import SceneSerializer from './core/SceneSerializer';
import MeshSerializer from './core/MeshSerializer';
import GroupSerializer from './core/GroupSerializer';
import SpriteSerializer from './core/SpriteSerializer';
import ServerObject from './core/ServerObject';
import WebGLRendererSerializer from './core/WebGLRendererSerializer';

// app
import OptionsSerializer from './app/OptionsSerializer';
import ScriptSerializer from './app/ScriptSerializer';

// camera
import CamerasSerializer from './camera/CamerasSerializer';

// light
import AmbientLightSerializer from './light/AmbientLightSerializer';
import DirectionalLightSerializer from './light/DirectionalLightSerializer';
import HemisphereLightSerializer from './light/HemisphereLightSerializer';
import PointLightSerializer from './light/PointLightSerializer';
import SpotLightSerializer from './light/SpotLightSerializer';
import RectAreaLightSerializer from './light/RectAreaLightSerializer';

import AddObjectCommand from '../command/AddObjectCommand';

/**
 * 场景序列化/反序列化类
 * @author tengge / https://github.com/tengge1
 */
function Converter() {
    BaseSerializer.call(this);
}

Converter.prototype = Object.create(BaseSerializer.prototype);
Converter.prototype.constructor = Converter;

/**
 * 将应用转为json
 * @param {*} obj 格式：{ options: options, camera: camera, renderer: renderer, scripts: scripts, scene: scene }
 */
Converter.prototype.toJSON = function (obj) {
    var options = obj.options;
    var camera = obj.camera;
    var renderer = obj.renderer;
    var scripts = obj.scripts;
    var scene = obj.scene;

    var list = [];

    // 选项
    var config = (new OptionsSerializer()).toJSON(options);
    list.push(config);

    // 相机
    var camera = (new CamerasSerializer()).toJSON(camera);
    list.push(camera);

    // 渲染器
    var renderer = (new WebGLRendererSerializer()).toJSON(renderer);
    list.push(renderer);

    // 脚本
    var scripts = (new ScriptSerializer()).toJSON(scripts);
    scripts.forEach(n => {
        list.push(n);
    });

    // 场景
    this.sceneToJson(scene, list);

    return list;
};

/**
 * 场景转json
 * @param {*} scene 场景
 * @param {*} list 用于保存json的空数组
 */
Converter.prototype.sceneToJson = function (scene, list) {
    (function serializer(obj) {
        var json = null;

        if (obj.userData && obj.userData.Server === true) { // 服务器对象
            json = (new ServerObject()).toJSON(obj);
            list.push(json);
            return;
        }

        switch (obj.constructor.name) {
            case 'Scene':
                json = (new SceneSerializer()).toJSON(obj);
                break;
            case 'Group':
                json = (new GroupSerializer()).toJSON(obj);
                break;
            case 'Mesh':
                json = (new MeshSerializer()).toJSON(obj);
                break;
            case 'Sprite':
                json = (new SpriteSerializer()).toJSON(obj);
                break;
            case 'AmbientLight':
                json = (new AmbientLightSerializer()).toJSON(obj);
                break;
            case 'DirectionalLight':
                json = (new DirectionalLightSerializer()).toJSON(obj);
                break;
            case 'HemisphereLight':
                json = (new HemisphereLightSerializer()).toJSON(obj);
                break;
            case 'PointLight':
                json = (new PointLightSerializer()).toJSON(obj);
                break;
            case 'RectAreaLight':
                json = (new RectAreaLightSerializer()).toJSON(obj);
                break;
            case 'SpotLight':
                json = (new SpotLightSerializer()).toJSON(obj);
                break;
        }
        if (json) {
            list.push(json);
        } else {
            console.warn(`Converter: 没有 ${obj.constructor.name} 的序列化器。`);
        }

        obj.children && obj.children.forEach(n => {
            serializer.call(this, n);
        });
    })(scene);
};

/**
 * 场景反序列化
 * @param {*} jsons json对象（列表）
 * @param {*} options 配置选项 格式：{ server: serverUrl } 其中，serverUrl为服务端地址，用于下载模型、纹理等资源
 */
Converter.prototype.fromJson = function (jsons, options) {
    var obj = {
        options: null,
        camera: null,
        renderer: null,
        scripts: null,
        scene: null
    };

    // 选项
    var optionsJson = jsons.filter(n => n.metadata && n.metadata.generator === 'OptionsSerializer')[0];
    if (optionsJson) {
        obj.options = (new OptionsSerializer()).fromJSON(optionsJson);
    } else {
        console.warn(`Converter: 场景中不存在配置信息。`);
    }

    // 相机
    var cameraJson = jsons.filter(n => n.metadata && n.metadata.generator.indexOf('CameraSerializer') > -1)[0];
    if (cameraJson) {
        obj.camera = (new CamerasSerializer()).fromJSON(cameraJson);
    } else {
        console.warn(`Converter: 场景中不存在相机信息。`);
    }

    // 渲染器
    var rendererJson = jsons.filter(n => n.metadata && n.metadata.generator.indexOf('WebGLRendererSerializer') > -1)[0];
    if (rendererJson) {
        obj.renderer = (new WebGLRendererSerializer()).fromJSON(rendererJson);
    } else {
        console.warn(`Converter: 场景中不存在渲染器信息。`);
    }

    // 脚本
    var scriptJsons = jsons.filter(n => n.metadata && n.metadata.generator === 'ScriptSerializer');
    if (scriptJsons) {
        obj.scripts = (new ScriptSerializer()).fromJSON(scriptJsons);
    }

    // 场景
    return new Promise(resolve => {
        this.sceneFromJson(jsons, options).then(scene => {
            obj.scene = scene;
            resolve(obj);
        });
    });
};

/**
 * json转场景
 * @param {*} jsons 反序列化对象列表
 * @param {*} options 配置信息
 */
Converter.prototype.sceneFromJson = function (jsons, options) {
    var sceneJson = jsons.filter(n => n.metadata && n.metadata.generator === 'SceneSerializer')[0];
    if (sceneJson === undefined) {
        console.warn(`Converter: 场景中不存在场景信息。`);
        return new Promise(resolve => {
            resolve(new THREE.Scene());
        });
    }

    var scene = (new SceneSerializer()).fromJSON(sceneJson);
    sceneJson._parent = scene;

    var queue = [sceneJson];

    return new Promise(resolve => {
        (function parse() {
            if (queue.length === 0) {
                resolve(scene);
                return;
            }
            var json = queue.shift();

            if (json.userData && json.userData.Server === true) { // 服务端对象
                (new ServerObject()).fromJSON(json, options).then(obj => {
                    json._parent.add(obj);
                    parse();
                });
                return;
            }

            var obj = null;

            switch (json.metadata.generator) {
                case 'SceneSerializer':
                    obj = (new SceneSerializer()).fromJSON(json);
                    break;
                case 'GroupSerializer':
                    obj = (new GroupSerializer()).fromJSON(json);
                    break;
                case 'MeshSerializer':
                    obj = (new MeshSerializer()).fromJSON(json);
                    break;
                case 'SpriteSerializer':
                    obj = (new SpriteSerializer()).fromJSON(json);
                    break;
                case 'AmbientLightSerializer':
                    obj = (new AmbientLightSerializer()).fromJSON(json);
                    break;
                case 'DirectionalLightSerializer':
                    obj = (new DirectionalLightSerializer()).fromJSON(json);
                    break;
                case 'HemisphereLightSerializer':
                    obj = (new HemisphereLightSerializer()).fromJSON(json);
                    break;
                case 'PointLightSerializer':
                    obj = (new PointLightSerializer()).fromJSON(json);
                    break;
                case 'RectAreaLightSerializer':
                    obj = (new RectAreaLightSerializer()).fromJSON(json);
                    break;
                case 'SpotLightSerializer':
                    obj = (new SpotLightSerializer()).fromJSON(json);
                    break;
            }

            if (obj) {
                json._parent.add(obj);
            } else {
                console.warn(`Converter: 不存在${json.metadata.type}的反序列化器。`);
            }

            if (json.children && Array.isArray(json.children) && obj) {
                json.children.forEach(uuid => {
                    var childJson = jsons.filter(n => n.id === uuid)[0];
                    if (childJson) {
                        childJson._parent = obj;
                        queue.push(childJson);
                    } else {
                        console.warn(`Converter: 场景中不存在${uuid}的对象。`);
                    }
                });
            }
            parse();
        })();
    });
};

export default Converter;
