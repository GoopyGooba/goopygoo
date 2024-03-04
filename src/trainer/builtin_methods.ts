import {type Pack} from "./model/MethodPackManager";

export const default_scan_method_pack: Pack = {
    type: "default",
    local_id: "default:scanmethods",
    original_id: "default:scanmethods",
    author: "Zyklop Marco",
    timestamp: 1700749105,
    name: "Default Scan Methods",
    description: "This default pack features standard scan routes based on the guide by Fiery and some other contributors.",
    default_method_name: "Default Scan Route",
    methods: [],
    default_assumptions: {
        double_escape: true,
        double_surge: true,
        meerkats_active: true,
        mobile_perk: true
    }
}

export const default_generic_method_pack: Pack = {
    type: "default",
    name: "Default Clue Paths",
    local_id: "default:genericmethods",
    original_id: "default:genericmethods",
    author: "Zyklop Marco",
    timestamp: 1700749105,
    description: "",
    default_method_name: "Default Route",
    methods: [],
    default_assumptions: {
        double_escape: true,
        double_surge: true,
        way_of_the_footshaped_key: true,
        full_globetrotter: true,
        meerkats_active: true,
        mobile_perk: true
    }
}