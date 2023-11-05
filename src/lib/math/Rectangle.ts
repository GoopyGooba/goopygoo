import {clamp} from "lodash";
import * as leaflet from "leaflet";
import {Vector2} from "./Vector2";

export type Rectangle = { topleft: Vector2, botright: Vector2 }

export namespace Rectangle {
    export function from(a: Vector2, b: Vector2): Rectangle {
        return {
            topleft: {x: Math.min(a.x, b.x), y: Math.max(a.y, b.y)},
            botright: {x: Math.max(a.x, b.x), y: Math.min(a.y, b.y)},
        }
    }

    export function contains(box: Rectangle, tile: Vector2) {
        return box.topleft.x - 0.5 <= tile.x
            && box.topleft.y + 0.5 >= tile.y
            && box.botright.x + 0.5 >= tile.x
            && box.botright.y - 0.5 <= tile.y
    }

    export function extend(box: Rectangle, padding: number): Rectangle {
        return {
            topleft: Vector2.add(box.topleft, {x: -padding, y: padding}),
            botright: Vector2.add(box.botright, {x: padding, y: -padding}),
        }
    }

    export function clampInto(pos: Vector2, area: Rectangle): Vector2 {
        return {
            x: clamp(pos.x, area.topleft.x, area.botright.x),
            y: clamp(pos.y, area.botright.y, area.topleft.y),
        }
    }

    export function center(box: Rectangle, snap: boolean = true): Vector2 {
        let c = {
            x: (box.topleft.x + box.botright.x) / 2,
            y: (box.topleft.y + box.botright.y) / 2
        }

        if (snap) return Vector2.snap(c)
        else return c
    }

    export function toBounds(box: Rectangle) {
        let tl = leaflet.point(box.topleft)
        let br = leaflet.point(box.botright)

        return leaflet.bounds(tl, br)
    }

    export function left(rect: Rectangle): Rectangle {
        return {
            topleft: {x: rect.topleft.x, y: rect.topleft.y},
            botright: {x: rect.topleft.x, y: rect.botright.y}
        }
    }

    export function right(rect: Rectangle): Rectangle {
        return {
            topleft: {x: rect.botright.x, y: rect.topleft.y},
            botright: {x: rect.botright.x, y: rect.botright.y}
        }
    }

    export function top(rect: Rectangle): Rectangle {
        return {
            topleft: {x: rect.topleft.x, y: rect.topleft.y},
            botright: {x: rect.botright.x, y: rect.topleft.y}
        }
    }

    export function bottom(rect: Rectangle): Rectangle {
        return {
            topleft: {x: rect.topleft.x, y: rect.botright.y},
            botright: {x: rect.botright.x, y: rect.botright.y}
        }
    }

    export function tileWidth(rect: Rectangle): number {
        return rect.botright.x - rect.topleft.x + 1
    }

    export function tileHeight(rect: Rectangle): number {
        return rect.topleft.y - rect.botright.y + 1
    }

    export function width(rect: Rectangle): number {
        return rect.botright.x - rect.topleft.x
    }

    export function height(rect: Rectangle): number {
        return rect.topleft.y - rect.botright.y
    }

    export function extendTo(rect: Rectangle, tile: Vector2): Rectangle {
        return {
            topleft: {
                x: Math.min(rect.topleft.x, tile.x),
                y: Math.max(rect.topleft.y, tile.y)
            },
            botright: {
                x: Math.max(rect.botright.x, tile.x),
                y: Math.min(rect.botright.y, tile.y)
            }
        }
    }

    export function extendToRect(rect: Rectangle, other: Rectangle): Rectangle {
        return extendTo(extendTo(rect, other.topleft), other.botright)
    }

    export function translate(rect: Rectangle, off: Vector2): Rectangle {
        return {
            topleft: Vector2.add(rect.topleft, off),
            botright: Vector2.add(rect.botright, off)
        }
    }
}
