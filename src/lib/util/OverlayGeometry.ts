import {Rectangle, Transform, Vector2} from "../math";
import {util} from "./util";
import {mixColor} from "@alt1/base";
import todo = util.todo;
import uuid = util.uuid;

export class OverlayGeometry {
  private shown_group_name: string = null

  private geometry: OverlayGeometry.Geometry[] = []

  rect(rect: Rectangle, options: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT): this {
    this.geometry.push({type: "rect", rect: rect, options: options})
    return this
  }

  line(from: Vector2, to: Vector2, options: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT) {
    this.geometry.push({type: "line", from: from, to: to, options: options})
    return this
  }

  text(text: string, position: Vector2,
       options: OverlayGeometry.TextOptions = OverlayGeometry.TextOptions.DEFAULT): this {
    this.geometry.push({
      type: "text",
      text: text,
      position: position,
      options: options
    })

    return this
  }

  add(other: OverlayGeometry): this {
    this.geometry.push(...other.geometry)
    return this
  }

  transform(transform: Transform): this {
    todo()

    return this
  }

  show(time: number): this {
    if (this.shown_group_name) this.hide()

    this.shown_group_name = uuid()

    alt1.overLaySetGroup(this.shown_group_name)

    for (let element of this.geometry) {
      switch (element.type) {
        case "rect":
          const origin = Rectangle.screenOrigin(element.rect)

          alt1.overLayRect(
            element.options.color,
            origin.x, origin.y,
            Rectangle.width(element.rect), Rectangle.height(element.rect),
            time,
            element.options.width
          )

          break;
        case "line":
          alt1.overLayLine(
            element.options.color,
            element.options.width,
            element.from.x, element.from.y,
            element.to.x, element.to.y,
            time
          )
          break;
        case "text":
          alt1.overLayTextEx(element.text, element.options.color, element.options.width,
            element.position.x, element.position.y,
            time, undefined, element.options.centered, element.options.shadow
          )
          break
      }
    }

    // Reset group name
    alt1.overLaySetGroup("")

    return this
  }

  hide(): this {
    alt1.overLayClearGroup(this.shown_group_name)
    this.shown_group_name = null

    return this
  }
}

export namespace OverlayGeometry {
  export type Geometry = {
    type: "line",
    from: Vector2,
    to: Vector2,
    options: StrokeOptions
  } | {
    type: "rect",
    rect: Rectangle,
    options: StrokeOptions
  } | {
    type: "text",
    text: string,
    position: Vector2,
    options: TextOptions,
  }

  export namespace Geometry {
    export function transform(geometry: Geometry, trans: Transform): Geometry {
      switch (geometry.type) {
        case "rect":
          return {
            type: "rect",
            rect: Rectangle.transform(geometry.rect, trans),
            options: geometry.options
          }
        case "line":
          break;
      }
    }
  }

  export type StrokeOptions = {
    color: number,
    width: number
  }

  export namespace StrokeOptions {
    export const DEFAULT: StrokeOptions = {
      width: 2,
      color: mixColor(255, 0, 0)
    }
  }

  export type TextOptions = StrokeOptions & {
    centered: boolean,
    shadow: boolean
  }

  export namespace TextOptions {
    export const DEFAULT: TextOptions = {
      width: 20,
      color: mixColor(255, 0, 0),
      centered: true,
      shadow: true
    }
  }

  export function over(): OverlayGeometry {
    return new OverlayGeometry()
  }
}