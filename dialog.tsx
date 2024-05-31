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

import util from './util';
import {
	_CVD,mainScreenScale,createCss,link, VDom,View,Transform,Input,
	ViewController
} from '.';
import {Navigation} from './nav';
import {Window} from './window';
import * as types from './types';

const px = 1 / mainScreenScale();

createCss({
	'.x_dialog': {
	},
	'.x_dialog.main': {
		width: 380, // min width
		widthLimit: '40!',// max
		heightLimit: '40!',//max
		align: 'centerCenter',
		backgroundColor: '#fff',
		borderRadius: 12,
	},
	'.x_dialog.sheet': {
		width: 'match',
		margin: 10,
		align: 'centerBottom',
	},
	'.x_dialog .title': {
		width: 'match',
		margin: 10,
		marginTop: 18,
		marginBottom: 0,
		textAlign: 'center',
		textWeight: 'bold',
		textSize: 18,
		// textSize: 16,
		textOverflow: 'ellipsis',
		textWhiteSpace: 'noWrap',
	},
	'.x_dialog .content': {
		width: 'match',
		margin: 10,
		marginTop: 2,
		marginBottom: 20,
		textAlign: 'center',
		textSize: 14,
		textColor: '#333',
	},
	'.x_dialog .buttons': {
		width: 'match',
		borderRadiusLeftBottom: 12,
		borderRadiusRightBottom: 12,
	},
	'.x_dialog.sheet .buttons': {
		borderRadius: 12,
		backgroundColor: '#fff',
		marginTop: 10,
	},
	'.x_dialog .button': {
		height: 43,
		// borderTop: `${px} #9da1a0`,
		borderColorTop: `#9da1a0`,
		textSize: 18,
		textLineHeight: 43,
		textColor:"#0079ff",
	},
	'.x_dialog.sheet .button': {
		height: 45,
		textLineHeight: 45,
	},
	'.x_dialog .button.gray': {
		textColor:"#000",
	},
	'.x_dialog .button:normal': {
		backgroundColor: '#fff', time: 180
	},
	'.x_dialog .button:hover': {
		backgroundColor: '#E1E4E455', time: 50
	},
	'.x_dialog .button:down': {
		backgroundColor: '#E1E4E4', time: 50
	},
	'.x_dialog .prompt': {
		marginTop: 10,
		width: "match",
		height: 30,
		backgroundColor: "#eee",
		borderRadius: 8,
	},
});

export const Consts = {
	Ok: 'OK',
	Cancel: 'Cancel',
	Placeholder: 'Please enter..',
};

/**
 * @class Dialog
 */
export class Dialog<P={},S={}> extends Navigation<{
	onAction?:(e:number)=>void;
	title?: string;
	content?: string;
	autoClose?: boolean;
}&P,S> {
	private _buttons = [];

	private _computeButtonsWidth() {
		let self = this;
		let len = self.length;
		if (!len || !self.domAs().visible)
			return;
		// TODO ...
		// if ( len == 1 ) {
		// 	(self.find<Clip>('btns').first as Button).width = types.parseValue('full');
		// } else  {
		// 	let main_width = self.find<Indep>('main').finalWidth;
		// 	if ( main_width ) {
		// 		let btn = self.find<Clip>('btns').first as Button;
		// 		while (btn) {
		// 			btn.width = new types.Value(types.ValueType.PIXEL, (main_width / len) - ((len - 1) * px));
		// 			btn.borderLeft = types.parseBorder(`${px} #9da1a0`);
		// 			btn.borderTopWidth = px;
		// 			btn = btn.next as Button;
		// 		}
		// 		(self.find<Clip>('btns').first as Button).borderLeftWidth = 0;
		// 	}
		// }
	}

	private _autoClose() {
		if (this.autoClose)
			this.close();
	}

	@link title = '';
	@link content = '';
	@link autoClose = true;

	get length() {
		return this._buttons.length;
	}

	get buttons() {
		return this._buttons;
	}

	set buttons(value) {
		if ( Array.isArray(value) ) {
			this._buttons = value;
			this.update();
		}
	}

	protected triggerUpdate(a: VDom, b: VDom) {
		this._computeButtonsWidth();
		return super.triggerUpdate(a,b);
	}

	protected triggerAction(index: number) {
		this.props.onAction?.call(null, index);
		this._autoClose();
	}

	protected render() {
		return (
			// <Indep width="100%" height="100%" backgroundColor="#0008" receive={true} visible={false} opacity={0}>
			// 	<LimitIndep id="main" class="x_dialog main">
			// 		<Hybrid id="title" class="title">{this.title}</Hybrid>
			// 		<Hybrid id="con" class="content">{this.content||vdoms}</Hybrid>
			// 		<Clip id="btns" class="buttons">
			// 		{
			// 			this.m_buttons.map((e, i)=>(
			// 				<Button 
			// 					index={i}
			// 					class="button"
			// 					borderTopWidth={px}
			// 					onClick={(e:any)=>this._handleClick(e)}
			// 					defaultHighlighted={0}>{e}</Button>
			// 			))
			// 		}
			// 		</Clip>
			// 	</LimitIndep>
			// </Indep>
			<box width="100%" height="100%" backgroundColor="#0008" receive={true} visible={false} opacity={0}>
				<transform ref="main" class="x_dialog main">
					<text ref="title" class="title">{this.title}</text>
					<text ref="con" class="content">{this.content||this.children}</text>
					<box ref="btns" class="buttons">
					{
						this._buttons.map((e,i)=>(
							<button
								key={i}
								class="button"
								borderWidthTop={px}
								onClick={e=>this.triggerAction(i)}
							>{e}</button>
						))
					}
					</box>
				</transform>
			</box>
		);
	}

	show() {
		if (!this.domAs().visible) {
			super.appendTo(this.window.root);
			this.domAs().visible = true;
			this.window.nextFrame(()=>{
				this._computeButtonsWidth();
				let main = this.refs.main as Transform;
				let size = main.clientSize;
				main.style.origin = [size.x / 2, size.y / 2];
				main.scale = new types.Vec2({x:0.2, y:0.2});
				main.transition({ scale : '1 1', time: 250 });
				this.domAs().opacity = 0.2;
				this.domAs().transition({ opacity : 1, time: 250 });
			});
			this.registerNavigation(0);
		}
	}

	close() {
		if ( this.domAs().visible ) {
			let main = this.refs.main as Transform;
			let size = main.clientSize;
			main.style.origin = [size.x / 2, size.y / 2];
			main.transition({ scale : '0.2 0.2', time: 300 });
			this.domAs().transition({ opacity : 0.05, time: 300 }, ()=>{ this.destroy() });
			this.unregisterNavigation(0);
		} else {
			this.unregisterNavigation(0);
			this.destroy();
		}
	}

	navigationBack() {
		if ( this.length ) {
			this.triggerAction(0);
		} else {
			this._autoClose();
		}
		return true;
	}

	navigationEnter(focus: View) {
		if ( !this.domAs().isSelfChild(focus) ) {
			if ( this.length ) {
				this.triggerAction(this.length - 1);
			} else {
				this._autoClose();
			}
		}
	}

	appendTo(): View { throw Error.new('Access forbidden.') }
	afterTo(): View { throw Error.new('Access forbidden.') }
}

/**
 * @class Sheet
 */
export class Sheet<P={},S={}> extends Dialog<P,S> {
	protected triggerUpdate() {
		return (Navigation as any).prototype.triggerUpdate.call(this);
	}

	render() {
		let length = this.length;
		let content = this.content ? this.content :
			this.children.length ? this.children: null;
		return (
			// <Indep width="100%" height="100%" backgroundColor="#0008" onClick={()=>this.navigationBack()} visible={0} opacity={0}>
			// {content?
			// 	<Indep id="main" class="x_dialog sheet">{content}</Indep>:
			// 	<Indep id="main" class="x_dialog sheet">
			// 		<Clip class="buttons">
			// 		{
			// 			length?
			// 			this.buttons.slice().map((e,i)=>(
			// 				<Button 
			// 					index={length-i}
			// 					class="button"
			// 					width="100%"
			// 					onClick={(e:any)=>this._handleClick(e)}
			// 					borderTopWidth={i?px:0}
			// 					defaultHighlighted={0}>{e}</Button>
			// 			)):
			// 			<Button 
			// 				index={1}
			// 				class="button"
			// 				width="100%"
			// 				onClick={(e:any)=>this._handleClick(e)}
			// 				defaultHighlighted={0}>{CONSTS.OK}</Button>
			// 		}
			// 		</Clip>
			// 		<Clip class="buttons">
			// 			<Button 
			// 				index={0}
			// 				class="button gray"
			// 				width="100%"
			// 				onClick={(e:any)=>this._handleClick(e)}
			// 				defaultHighlighted={0}>{CONSTS.CANCEL}</Button>
			// 		</Clip>
			// 	</Indep>
			// }
			// </Indep>
			<box
				width="100%" height="100%"
				backgroundColor="#0008"
				onClick={()=>this.navigationBack()} visible={false} opacity={0}
			>
			{content?
				<box ref="main" class="x_dialog sheet">{content}</box>:
				<box ref="main" class="x_dialog sheet">
					<box class="buttons" clip={true}>
					{
						length?
						this.buttons.slice().map((e,i)=>(
							<button
								class="button"
								width="100%"
								onClick={e=>this.triggerAction(length-i)}
								borderWidthTop={i?px:0}
							>{e}</button>
						)):
						<button
							class="button"
							width="100%"
							onClick={e=>this.triggerAction(1)}
						>{Consts.Ok}</button>
					}
					</box>
					<box class="buttons" clip={true}>
						<button
							class="button gray"
							width="100%"
							onClick={e=>this.triggerAction(0)}
						>{Consts.Cancel}</button>
					</box>
				</box>
			}
			</box>
		);
	}

	show() {
		if (!this.domAs().visible) {
			ViewController.prototype.appendTo.call(this, this.window.root);
			this.domAs().visible = true;
			this.window.nextFrame(()=>{
				let main = this.refs.main as Transform;
				main.y = main.clientSize.y;
				main.transition({ y: 0, time: 250 });
				this.domAs().opacity = 0.3;
				this.domAs().transition({ opacity : 1, time: 250 });
			});
			this.registerNavigation(0);
		}
	}

	close() {
		if ( this.domAs().visible ) {
			let main = this.refs.main as Transform;
			main.transition({ y: main.clientSize.y, time: 250 });
			this.domAs().transition({ opacity : 0.15, time: 250 }, ()=>{ this.destroy() });
			this.unregisterNavigation(0);
		} else {
			this.unregisterNavigation(0);
			this.destroy();
		}
	}
}

export function alert(window: Window, msg: string | {msg?:string, title?: string}, cb = util.noop) {
	let message: any;
	if (typeof msg == 'string')
		message = {msg};
	let { msg: _msg = '', title = '' } = message;
	let dag: Dialog = (
		<Dialog buttons={[Consts.Ok]} onAction={cb} title={title}>{_msg}</Dialog>
	).newDom(window.rootCtr);
	dag.show();
	return dag;
}

export function confirm(window: Window, msg: string, cb: (ok: boolean)=>void = util.noop) {
	let dag: Dialog = (
		<Dialog buttons={[Consts.Cancel, Consts.Ok]} onAction={e=>cb(!!e)}>{msg}</Dialog>
	).newDom(window.rootCtr);
	dag.show();
	return dag;
}

export function prompt(window: Window, msg: string | {
		msg?: string, text?: string, placeholder?: string, security?: boolean 
	},
	cb: (ok: boolean, str: string)=>void = util.noop
) {
	let message: any;
	if (typeof msg == 'string')
		message = {msg};
	let { msg: _msg = '', text = '', placeholder = Consts.Placeholder, security = false } = message;
	let dag: Dialog = (
		<Dialog 
			action_time={100}
			buttons={[Consts.Cancel, Consts.Ok]} 
			onAction={e=>cb(!!e, e ? (dag.refs.input as Input).value: '')}
		>
			{/* <Span>
				{_msg}
				<Input security={security} id="input" class="prompt"
					returnType="done" onKeyEnter={()=>{
						(dag as any).triggerAction(1);
						(dag as any)._actionClose();
					}}
					value={text} placeholder={placeholder} />
			</Span> */}
			<box>
				{_msg}
				<input
					security={security}
					ref="input"
					class="prompt"
					returnType="done"
					value={text}
					placeholder={placeholder}
					onKeyEnter={()=>(dag as any).triggerAction(1)}
				/>
			</box>
		</Dialog>
	).newDom(window.rootCtr);
	dag.show();
	(dag.refs.input as Input).focus();
	return dag;
}

export function show(window: Window, title: string, msg: string, buttons: string[] = [Consts.Ok], cb: (index: number)=>void = util.noop) {
	let dag: Dialog = (
		<Dialog title={title} buttons={buttons} onAction={cb}>{msg}</Dialog>
	).newDom(window.rootCtr);
	dag.show();
	return dag;
}

export function sheet(window: Window, content: string) {
	let dag: Sheet = (<Sheet content={content} />).newDom(window.rootCtr);
	dag.show();
	return dag;
}

export function sheetConfirm(window: Window, buttons: string[] = [Consts.Ok], cb: (index: number)=>void = util.noop) {
	let dag: Sheet = (
		<Sheet buttons={buttons} onAction={cb} />
	).newDom(window.rootCtr);
	dag.show();
	return dag;
}

export class DialogController<P={},S={}> extends ViewController<P,S> {
	alertDialog(msg: string | {msg?:string, title?: string}, cb = util.noop) {
		return alert(this.window, msg, cb);
	}
	promptDialog(msg: string | { msg?: string, text?: string, placeholder?: string, security?: boolean },
		cb: (ok: boolean, str: string)=>void = util.noop
	) {
		return prompt(this.window, msg, cb);
	}
	confirmDialog(msg: string, cb: (ok: boolean)=>void = util.noop) {
		return confirm(this.window, msg, cb);
	}
	showDialog(title: string, msg: string, buttons: string[] = [Consts.Ok], cb: (index: number)=>void = util.noop) {
		return show(this.window, title, msg, buttons, cb);
	}
	sheetDialog(content: string) {
		return sheet(this.window, content);
	}
}