/*
 * Copyright 2017-2020 The ShadowEditor Authors. All rights reserved.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file.
 * 
 * For more information, please visit: https://github.com/tengge1/ShadowEditor
 * You can also visit: https://gitee.com/tengge1/ShadowEditor
 */
import Command from './Command';

/**
 * 设置颜色命令
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 * @param {THREE.Object3D} object 物体
 * @param {String} attributeName 属性名称
 * @param {Object} newValue HEX颜色值
 * @constructor
 */
function SetColorCommand(object, attributeName, newValue) {
	Command.call(this);

	this.type = 'SetColorCommand';
	this.name = _t('Set') + ' ' + attributeName;
	this.updatable = true;

	this.object = object;
	this.attributeName = attributeName;
	this.oldValue = object !== undefined ? this.object[this.attributeName].getHex() : undefined;
	this.newValue = newValue;
}

SetColorCommand.prototype = Object.create(Command.prototype);

Object.assign(SetColorCommand.prototype, {
	constructor: SetColorCommand,

	execute: function () {
		this.object[this.attributeName].setHex(this.newValue);
		app.call('objectChanged', this, this.object);
	},

	undo: function () {
		this.object[this.attributeName].setHex(this.oldValue);
		app.call('objectChanged', this, this.object);
	},

	update: function (cmd) {
		this.newValue = cmd.newValue;
	},

	toJSON: function () {
		var output = Command.prototype.toJSON.call(this);

		output.objectUuid = this.object.uuid;
		output.attributeName = this.attributeName;
		output.oldValue = this.oldValue;
		output.newValue = this.newValue;

		return output;
	},

	fromJSON: function (json) {
		Command.prototype.fromJSON.call(this, json);

		this.object = this.editor.objectByUuid(json.objectUuid);
		this.attributeName = json.attributeName;
		this.oldValue = json.oldValue;
		this.newValue = json.newValue;
	}
});

export default SetColorCommand;