//alt1 base libs, provides all the commonly used methods for image matching and capture
//also gives your editor info about the window.alt1 api
import "jquery";
import {initialize} from "./application";

//tell webpack to add index.html and appconfig.json to output
require("!file-loader?name=[name].[ext]!../static/index.html");
require("!file-loader?name=[name].[ext]!../static/style.css");
require("!file-loader?name=[name].[ext]!../static/appconfig.json");

require("bootstrap")

document.addEventListener("DOMContentLoaded", (e) => {

    //check if we are running inside alt1 by checking if the alt1 global exists
    if (window.alt1) {
        //tell alt1 about the app
        //this makes alt1 show the add app button when running inside the embedded browser
        //also updates app settings if they are changed
        alt1.identifyAppUrl("./appconfig.json");
    }

    initialize()
})

