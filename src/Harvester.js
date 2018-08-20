'use strict';

const opn = require('opn');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const net = require('net');
const Secret = require('./Secret');
const Constants = require('./Constants');
const puppeteer = require('puppeteer');

const Event = Constants.Event;

module.exports = class Harvester{
    /**
     * Initialise CaptchaHarvester (start HTTP server)
     * @param {Number|undefined} httpPort
     * @param {Number|undefined} webSocketPort
     * @param {Boolean|undefined} remoteServerPort
     * @param {Boolean|undefined} openBrowser
     * @param {Boolean|undefined} debug
     */
    constructor(httpPort = 8081, webSocketPort = 8082, remoteServerPort = undefined, openBrowser = true, debug = false){
        this.debug = debug;

        this.httpPort = httpPort;
        this.captchaCallbacks = {};
        this.captchaCallbackIndex = 0;

        this.webSocketServer = null;
        this.webSocketClients = [];
        this.sendQueue = [];

        this.tcpServer = null;
        this.tcpSocketClients = [];


        this.openBrowser = openBrowser;
        this.firstCaptchaRequested = false;

        const app = express();
        app.use(express.static(__dirname + '/../html'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.get('/captcha/:captchaCallbackIndex/:siteKey/:host', (request, response)=>{
            const {captchaCallbackIndex, siteKey, host} = request.params;
            response.send('' +
                '<html>' +
                '   <head>' +
                '       <title>reCAPTCHA</title>' +
                '       <script src="https://www.google.com/recaptcha/api.js" async defer></script>' +
                '   </head>' +
                '   <body>' +
                '       <form id="captcha_form" action="/captcha" method="POST">' +
                '       <input type="hidden" name="captchaCallbackIndex" value="' + captchaCallbackIndex + '" />' +
                '       <div class="g-recaptcha" data-sitekey="' + siteKey + '" ' + 
                '         data-size="invisible" data-callback="submit_form">' +
                '       </div>' +
                '       <br/>' +
                '       <input type="submit" value="Submit">' +
                '       </form>' +
                '       <script type="text/javascript">' +
                '           var virtualPointer=initVirtualPointer();function mag(e,t){return Math.sqrt(Math.pow(e,2)+Math.pow(t,2))}function gaussian(e){for(var t=0,n=0;n<7;n+=1)t+=Math.random();return t/7*(e||1)}function randomMouse(e){var t=window.innerWidth,n=window.innerHeight;return new Promise(a=>{!function e(a,o,r,s){if(0===a)return o();var u=Math.random()*t,i=Math.random()*n;mouse(r||Math.random()*t,s||Math.random()*n,u,i).then(()=>e(a-1,o,u,i))}(e,a)})}function mouse(e,t,n,a){return new Promise(o=>{const r=humanWindMouse(e,t,n,a,30,44,20,Math.floor(15*Math.random()+45));virtualPointer.mouse_by_coords(r,o)})}function humanWindMouse(e,t,n,a,o,r,s,u){var i=0,c=0,h=0,m=0,p=u,g=Math.sqrt(2),d=Math.sqrt(3),v=Math.sqrt(5),l=mag(e-n,t-a),f=0,y=[];do{var M=mag(e-n,t-a);r=Math.min(r,M),M<1&&(M=1);var X=Math.round(Math.round(.3*l)/7);X>25?X=25:X<5&&(X=5),gaussian(6)<1&&(X=gaussian()+2);var Y=Math.min(X,M);if(M>=s?(h=h/d+(gaussian(2*Math.round(r)+1)-r)/v,m=m/d+(gaussian(2*Math.round(r)+1)-r)/v):(h/=g,m/=g),i+=h,c+=m,mag(i+=o*(n-e)/M,c+=o*(a-t)/M)>Y){var x=Y/2+gaussian(Y/2),E=Math.sqrt(i*i+c*c);i=i/E*x,c=c/E*x}var w=Math.round(e),T=Math.round(t);e+=i,t+=c;var _=Math.round(e),P=Math.round(t);w==_&&T==P||y.push({x:_,y:P,t:f});var b=Math.round(.9*gaussian(100/p*6));b<5&&(b=5+Math.round(gaussian(3))),f+=b}while(mag(e-n,t-a)>=1);return Math.round(n)==Math.round(e)&&Math.round(a)==Math.round(t)||y.push({x:e,y:t,t:f}),y}function initVirtualPointer(){var e={x:1,y:1},t=[],n=20,a=50,o=200,r=230*Math.random()+20,s=1,u=30;function i(n){if(t.length){var a=t[0],o=t[1];if(function(t,n,a,o,r,i,c,h,m,p){if("scroll"!=t){i||(i=n+s),c||(c=a+u),r||"click"!==t&&"mousedown"!==t&&"mouseup"!==t||(r=0);var g,d="mousemove"!==t&&"touchmove"!==t?1:0;h&&("ontouchstart"in window||navigator.msMaxTouchPoints>0)?(g=document.createEvent("TouchEvent")).initTouchEvent(t,!0,!0,window,d,i,c,n,a,!1,!1,!1,!1,r,null):(g=document.createEvent("MouseEvent")).initMouseEvent(t,!0,!0,window,d,i,c,n,a,!1,!1,!1,!1,r,null),o?o.dispatchEvent(g):document.body.dispatchEvent(g),e={x:i,y:c}}else window.scrollTo(m,p)}(a.type,a.pageX,a.pageY,a.target,null,a.screenX,a.screenY,a.isTouchEvent,a.scrollLeft,a.scrollTop),o){var r=o.timestamp-a.timestamp;setTimeout(()=>i(n),r),t.shift()}else"function"==typeof n&&n()}}function c(e){for(var n=0;n<e.length;n++)t.push({type:"mousemove",pageX:e[n].x,pageY:e[n].y,screenX:e[n].x+s,screenY:e[n].y+u,timestamp:e[n].t})}function h(e,n,a){var o=function(e){var t=document.body.getBoundingClientRect(),n=e.getBoundingClientRect(),a=n.top-t.top;return{x:n.left-t.left,y:a}}(e),s=t.length?t[t.length-1].timestamp:0;if(n||(n=r),a){o.x,o.y;t.push({type:"touchstart",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s,target:e,isTouchEvent:!0}),t.push({type:"touchmove",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+Math.floor(r/2),target:e,isTouchEvent:!0}),t.push({type:"touchend",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+r,target:e,isTouchEvent:!0})}else o.x,o.y;t.push({type:"mouseover",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+r+10,target:e,isTouchEvent:!1}),t.push({type:"mousemove",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+r+20,target:e,isTouchEvent:!1}),t.push({type:"mousedown",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+r+20,target:e,isTouchEvent:!1}),t.push({type:"mouseup",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+2*r,target:e,isTouchEvent:!1}),t.push({type:"click",pageX:o.x,pageY:o.y,screenX:screenX,screenY:screenY,timestamp:s+2*r+10,target:e,isTouchEvent:!1})}function m(e){setTimeout(()=>i(e),a)}return{mouse_by_coords:function(e,t){c(e),m(t)},move_mouse_to_element:function(e,t){e&&(c(e),m())},click_element:function(e){e&&(h(e),m())},move_to_element_and_click:function(e,t){e&&(c(e),h(e),m())},tap_element:function(e){e&&(h(e,null,!0),m())},double_tap_element:function(e){e&&(h(e,null,!0),h(e,25,!0),m())},flick_to_element:function(a,r){a&&(!function(a,r){var s=document.body.getBoundingClientRect(),u=a.getBoundingClientRect(),i=u.top-s.top,c=u.left-s.left,h=c-e.x,m=i-e.y;r||(r=o),t.push({type:"touchstart",pageX:e.x,pageY:e.y,screenX:e.x,screenY:e.y,timestamp:0,target:a,isTouchEvent:!0});for(var p=r/n,g=1;g<=p;g++){var d=Math.round(h/p*g)+e.x,v=Math.round(m/p*g)+e.y;t.push({type:"touchmove",pageX:d,pageY:v,screenX:d,screenY:v,timestamp:g*n,target:a,isTouchEvent:!0})}var l=t.length?t[t.length-1].timestamp:0;t.push({type:"touchend",pageX:c,pageY:i,screenX:c,screenY:i,timestamp:l,target:a,isTouchEvent:!0})}(a,r),m())},run_serialized_events:function(e){!e||!e instanceof Array||(t=e,m())}}}' +
                '           var submit_form = () => document.getElementById("captcha_form").submit();' +
                '           document.addEventListener("DOMContentLoaded", () => setTimeout(() => { randomMouse(Math.floor(Math.random() * 3 + 3)).then(() => grecaptcha.execute()); }, Math.floor(Math.random() * 60 + 20) ));' +
                '       </script>' +
                '   </body>' +
                '</html>'
            );
        });
        app.post('/captcha', (request, response)=>{
            const captchaCallbackIndex = parseInt(request.body['captchaCallbackIndex']);
            const captchaCallback = this.captchaCallbacks[captchaCallbackIndex];
            captchaCallback(request.body['g-recaptcha-response']);
            delete this.captchaCallbacks[captchaCallbackIndex];
            response.end();
            this._sendWebSocketClients(Event.WebSocket.RemoveCaptchaEvent, {
                captchaCallbackIndex: captchaCallbackIndex
            });
        });
        app.listen(httpPort);

        if(Number.isInteger(remoteServerPort)){
            this.tcpServer = net.createServer((socket)=>{
                socket.authenticated = false;
                socket.key = socket.remoteAddress + ':' + socket.remotePort;
                socket.id = this.tcpSocketClients.length;
                this.tcpSocketClients.push(socket);
                if(debug){
                    console.log(socket.key + ' has connected to the TCP server');
                }
                setTimeout(()=>{
                    if(!socket.authenticated){
                        this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                            authenticated: false,
                            message: 'Not authenticated in time'
                        });
                        this.tcpSocketClients.splice(socket.id, 1);
                    }
                }, 3000);
                const onEvent = async(event, data)=>{
                    switch(event){
                        case Event.TCP.ClientAuthenticateEvent:
                            if(data.secret === Secret){
                                socket.authenticated = true;
                                this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                                    authenticated: true,
                                    message: 'Successfully authenticated'
                                });
                            }else{
                                this._sendSocket(socket, Event.TCP.ClientAuthenticatedEvent, {
                                    authenticated: false,
                                    message: 'Wrong secret'
                                });
                            }
                            break;
                        case Event.TCP.CaptchaRequestEvent:
                            const response = await this.getResponse(data.host, data.siteKey, data.prioritise);
                            this._sendSocket(socket, Event.TCP.CaptchaResponseEvent, {
                                captchaCallbackIndex: data.captchaCallbackIndex,
                                response: response
                            });
                            if(!this.firstCaptchaRequested){
                                if(openBrowser){
                                    opn('http://127.0.0.1:' + httpPort);
                                }
                                this.firstCaptchaRequested = true;
                            }
                            break;
                    }
                };
                const endIdentifier = '\n\r\n\r';
                let buffers = [];
                socket.on('data', (buffer)=>{
                    buffers.push(buffer);
                    let bufferString = Buffer.concat(buffers).toString();
                    let endIndex = bufferString.indexOf(endIdentifier);
                    do{
                        const jsonString = bufferString.slice(0, endIndex);
                        try{
                            const json = JSON.parse(jsonString);
                            onEvent(json.event, json.data);
                        }catch(error){
                            console.log('Could not parse JSON on TCP server: ' + error.message);
                        }
                        const newString = bufferString.slice(endIndex + endIdentifier.length);
                        buffers = [new Buffer(newString)];
                        endIndex = newString.indexOf(endIdentifier);
                        bufferString = newString;
                    }while(endIndex > 0);
                });
            });
            this.tcpServer.listen(remoteServerPort);
        }

        this.webSocketServer = new WebSocket.Server({
            port: webSocketPort
        });
        this.webSocketServer.on('connection', (ws, request)=>{
            if(debug){
                console.log(request.connection.remoteAddress + ' has connected to the Web Socket Server');
            }
            this.webSocketClients.push(ws);
            if(this.webSocketClients.length === 1){ // first client, send queue messages
                for(let i = 0; i < this.sendQueue.length; i++){
                    const message = this.sendQueue[i];
                    this._sendWebSocketClients(message.event, message.data);
                }
            }
        });
        this.webSocketServer.on('message', (data)=>{
            try{
                const json = JSON.parse(data);
                const data = json.data;
                switch(json.event){

                }
            }catch(error){
                console.log('Could not parse WebSocket data: ' + error.message);
            }
        });
    }
    /**
     * Broadcast data to all WebSocket clients
     * @param {String} event
     * @param {Object} data
     * @private
     */
    _sendWebSocketClients(event, data){
        if(this.webSocketClients.length === 0){ // add to queue
            this.sendQueue.push({event: event, data: data});
        }else{
            for(let i = 0; i < this.webSocketClients.length; i++){
                this.webSocketClients[i].send(JSON.stringify({
                    event: event,
                    data: data
                }));
            }
        }
    }
    /**
     * Send data to TCP socket client
     * @param {net.Socket} socket
     * @param {String} event
     * @param {Object} data
     * @private
     */
    _sendSocket(socket, event, data){
        socket.write(JSON.stringify({
            event: event,
            data: data
        }) + '\n\r\n\r');
    }
    /**
     * Get the g-recaptcha-response from a captcha
     * @param {String} host
     * @param {String} siteKey
     * @param {Boolean|undefined} prioritise
     * @returns {Promise}
     */
    getResponse(host, siteKey, prioritise = false){
        if(!this.firstCaptchaRequested){
            if(this.openBrowser){
                opn('http://127.0.0.1:' + this.httpPort);
            }
            this.firstCaptchaRequested = true;
        }
        this._sendWebSocketClients(Event.WebSocket.AddCaptchaEvent, {
            captchaCallbackIndex: this.captchaCallbackIndex,
            url: 'http://localapi.' + host + ':' + this.httpPort + '/captcha/' + this.captchaCallbackIndex + '/' + siteKey + '/' + host,
            host: host,
            prioritise: prioritise
        });
        return new Promise((resolve)=>{
            this.captchaCallbacks[this.captchaCallbackIndex++] = resolve;
        });
    }
    /**
     * Set the maximum amount of captchas that can be displayed at once in the browser
     * @param {Number} limit
     */
    setBrowserDisplayedCaptchasLimit(limit = 30){
        this._sendWebSocketClients(Event.WebSocket.SetBrowserDisplayedCaptchasLimit, {
            limit: limit
        });
    }
    /**
     * Stop the Harvester
     */
    /*stop(){
        //this.tcpServer.destroy();
    }*/
};
