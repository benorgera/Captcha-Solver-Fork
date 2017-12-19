"use strict";

// debug is on so additional information will be shown in the console

const Harvester = require('../src/Harvester');

const harvester = new Harvester();

// preferred method: using async/await
async function run(){
    const response = await harvester.getResponse('consortium.co.uk', '6LeFoAsUAAAAAPZ-YMh5U8Dh_U9Fx5fqDBXeOz7d');
    console.log('consortium.co.uk: ' + response);
}
run();
setTimeout(run, 5000);
