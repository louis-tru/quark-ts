/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2015, blue.chu
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of blue.chu nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL blue.chu BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * ***** END LICENSE BLOCK ***** */

import {createCss,ViewController,_CVD} from '.';

createCss({
	'.x_checkbox': {
		width: 20,
		height: 20,
		backgroundColor: '#fff',
		border: '1 #aaa',
		borderRadius: 20,
		opacity: 1,
	},
	'.x_checkbox:hover': {
		backgroundColor: '#0079ff',
		border: '1 #0079ff',
		opacity: 0.7,
	},
	'.x_checkbox:active': {
		backgroundColor: '#0079ff',
		border: '1 #0079ff',
		opacity: 0.35,
	},
	'.x_checkbox.on': {
		backgroundColor: '#0079ff',
		border: '1 #0079ff',
	},
	'.x_checkbox .mark': {
		visible: false,
		textFamily: 'iconfont',
		textColor: '#fff',
		textSize: 14,
		textLineHeight: 20,
		opacity: 1,
	},
	'.x_checkbox.on .mark': {
		visible: true,
	},
	'.x_switch': {
		width: 50,
		height: 31,
		borderRadius: 16,
	},
	'.x_switch:normal': {
		backgroundColor: '#ddd',
		time: 300,
	},
	'.x_switch.on': {
		backgroundColor: '#4dd865',
		time: 300,
	},
	'.x_switch .background': {
		backgroundColor: '#eee',
		borderRadius: 16,
		align: 'centerMiddle',
	},
	'.x_switch:normal .background': {
		width: 46,
		height: 27,
		opacity: 1,
		time: 300,
	},
	'.x_switch.on .background, \
	.x_switch:active .background, \
	.x_switch:hover .background': {
		width: 0,
		height: 0,
		opacity: 0.2,
		time: 300,
	},
	'.x_switch .button': {
		borderRadius: 16,
		backgroundColor: '#fff',
		height: 27,
		x: 2,
		y: 2,
	},
	'.x_switch:normal .button': {
		width: 27,
		time: 200,
	},
	'.x_switch:active .button, \
	.x_switch:hover .button': {
		width: 33,
		time: 200,
	},
	'.x_switch.on .button': {
		x: 20,
		time: 200,
	},
	'.x_switch.on:active .button, \
	.x_switch.on:hover .button': {
		x: 14,
		time: 200,
	},
});

class Basic<P={},S={}> extends ViewController<{
	class?: string,
	disable?: boolean,
	initSelected?: boolean,
	onChange?:(value:boolean)=>void,
}&P,S> {
	private _selected = !!this.props.initSelected;

	triggerMounted() {
		this.domAs().onClick.on(()=>{
			if ( !this.props.disable )
				this.selected = !this.selected;
		}, '1');
	}

	protected triggerChange(value: boolean) {
		this.props.onChange?.call(null, value);
	}

	get selected() {
		return this._selected;
	}

	set selected(value: boolean) {
		if(value != this._selected) {
			this._selected = !!value;
			this.update();
			this.triggerChange(value);
		}
	}
}

export class Checkbox<P={},S={}> extends Basic<P,S> {
	render() {
		return (
			<button class={['x_checkbox',this.props.class||'',this.selected?'on':'']}>
				<label class="mark" value={"\ued71"} />
			</button>
		)
	}
}

export class Switch<P={},S={}> extends Basic<P,S> {
	render() {
		return (
			<button class={['x_switch',this.props.class||'',this.selected?'on':'']}>
				<free class="background" />
				<matrix class="button" />
			</button>
		);
	}
}

let test = ()=>(
	<Checkbox disable={false} initSelected={true}>
	</Checkbox>
);