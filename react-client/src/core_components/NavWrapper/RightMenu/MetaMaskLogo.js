import React from 'react';

import ModelViewer from 'metamask-logo'

class Application extends React.Component {

	componentDidmount() {
		// document.addEventListener('keypress', function(event) {
		// 	if (event.keyCode === 99) { // the c key
		// 		var svg = document.querySelector('svg')
		// 		var inner = svg.innerHTML
		// 		var head = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
		// 		'"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> ' +
		// 		'<svg width="521px" height="521px" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events">'
		// 		var foot = '</svg>'
        //
		// 		var full = head + inner + foot
        //
		// 		copy(full)
		// 	}
		// })
	}

	render() {

        var viewer = ModelViewer({

          // Dictates whether width & height are px or multiplied
          pxNotRatio: true,
          width: 500,
          height: 400,
          // pxNotRatio: false,
          // width: 0.9,
          // height: 0.9,

          // To make the face follow the mouse.
          followMouse: false,

          // head should slowly drift (overrides lookAt)
          slowDrift: false,

        })

		return (
			<div>
                {viewer.container}
            </div>
		);
	}
}

export default Application
