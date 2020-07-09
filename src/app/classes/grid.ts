import {Point} from './point';
import {Rect} from './rect';
import {Observable, Subject, Subscription} from 'rxjs';
import {UndoableEdit} from '../interfaces/undoable-edit.js';
import {GridUndoableEdit} from './gridUndoableEdit';
import {AttributeMode} from '../enums/attribute-mode';
import {Renderer} from '@angular/compiler-cli/ngcc/src/rendering/renderer';
import {PixelRenderer} from './pixelRenderer';

export class Grid {

  private _width: number;
  private _height: number;
  private _attributeMode: AttributeMode;

  private data: number[][];

  private changeSubject: Subject<Rect> = new Subject<Rect>();
  private changeObservable: Observable<Rect> = this.changeSubject.asObservable();

  constructor(width: number, height: number, attributeMode: AttributeMode, initialValue: number) {
    this.attributeMode = attributeMode;
    this.setSize(width, height, initialValue);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get attributeMode(): AttributeMode {
    return this._attributeMode;
  }

  set attributeMode(attributeMode: AttributeMode) {
    this._attributeMode = attributeMode;
  }

  getSize(): Rect {
    return new Rect(0, 0, this.width, this.height);
  }

  setSize(width: number, height: number, initialValue: number): void {
    this._width = width;
    this._height = height;
    this.data = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row[x] = initialValue;
      }
      this.data[y] = row;
    }
  }

  getValue(point: Point): number {
    return this.get(point.x, point.y);
  }

  getArea(rect: Rect): number[][] {
    const data: number[][] = [];
    for (let y = 0; y < rect.height; y++) {
      const row = [];
      for (let x = 0; x < rect.width; x++) {
        row[x] = this.get(rect.x + x, rect.y + y);
      }
      data.push(row);
    }
    return data;
  }

  setValue(point: Point, value: number): UndoableEdit {
    let undoableEdit: UndoableEdit;
    const oldValue = this.getValue(point);
    const pixelRect = new Rect(point.x, point.y, 1, 1);
    switch (this.attributeMode) {
      case AttributeMode.NONE: {
        const oldData = this.getArea(pixelRect);
        this.set(point.x, point.y, value);
        this.notifyChanges(new Rect(point.x, point.y, 1, 1));
        undoableEdit = new GridUndoableEdit(this, pixelRect, oldData);
        break;
      }
      case AttributeMode.EIGHT_X_ONE: {
        const x0 = point.x - (point.x % 8);
        const y0 = point.y;
        const rect = new Rect(x0, y0, 8, 1);
        const oldData = this.getArea(rect);
        this.set(point.x, point.y, value);
        if (this.countValues(rect) <= 2) {
          this.notifyChanges(new Rect(point.x, point.y, 1, 1));
        } else {
          this.change(rect, oldValue, value);
          this.notifyChanges(rect);
        }
        undoableEdit = new GridUndoableEdit(this, rect, oldData);
        break;
      }
      case AttributeMode.EIGHT_X_EIGHT: {
        const x0 = point.x - (point.x % 8);
        const y0 = point.y - (point.y % 8);
        const rect = new Rect(x0, y0, 8, 8);
        const oldData = this.getArea(rect);
        this.set(point.x, point.y, value);
        if (this.countValues(rect) <= 2) {
          this.notifyChanges(new Rect(point.x, point.y, 1, 1));
        } else {
          this.change(rect, oldValue, value);
          this.notifyChanges(rect);
        }
        undoableEdit = new GridUndoableEdit(this, rect, oldData);
        break;
      }
    }
    return undoableEdit;
  }

  // To be called from UndoableEdits. Does not generate a new UndoableEdit.
  setArea(rect: Rect, data: number[][]): void {
    for (let y = 0; y < rect.height; y++) {
      const row = data[y];
      for (let x = 0; x < rect.width; x++) {
        this.set(rect.x + x, rect.y + y, row[x]);
      }
    }
    this.notifyChanges(rect);
  }

  fill(value: number): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.set(x, y, value);
      }
    }
    this.notifyChanges(this.getSize());
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  floodFill(point: Point, newValue: number): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    const oldValue = this.getValue(point);
    this.floodFillValue(point.x, point.y, newValue, oldValue);
    this.applyAttributeMode();
    this.notifyChanges(this.getSize());
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  shiftLeft(): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    for (let y = 0; y < this.height; y++) {
      const row = this.data[y];
      const firstCell = row.shift();
      row.push(firstCell);
    }
    if (this.attributeMode !== AttributeMode.NONE) {
      this.applyAttributeMode();
    }
    this.notifyChanges(this.getSize());
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  shiftRight(): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    for (let y = 0; y < this.height; y++) {
      const row = this.data[y];
      const lastCell = row.pop();
      row.unshift(lastCell);
    }
    if (this.attributeMode !== AttributeMode.NONE) {
      this.applyAttributeMode();
    }
    this.notifyChanges(this.getSize());
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  shiftUp(): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    const firstRow = this.data.shift();
    this.data.push(firstRow);
    this.notifyChanges(this.getSize());
    if (this.attributeMode === AttributeMode.EIGHT_X_EIGHT) {
      this.applyAttributeMode();
    }
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  shiftDown(): UndoableEdit {
    const oldData = this.getArea(this.getSize());
    const lastRow = this.data.pop();
    this.data.unshift(lastRow);
    this.notifyChanges(this.getSize());
    if (this.attributeMode === AttributeMode.EIGHT_X_EIGHT) {
      this.applyAttributeMode();
    }
    return new GridUndoableEdit(this, this.getSize(), oldData);
  }

  subscribeToChanges(handler: (Rect) => void): Subscription {
    return this.changeObservable.subscribe(handler);
  }

  private notifyChanges(rect: Rect): void {
    this.changeSubject.next(rect);
  }

  private get(x: number, y: number): number {
    return this.data[y][x];
  }

  private set(x: number, y: number, value: number): void {
    this.data[y][x] = value;
  }

  private floodFillValue(x: number, y: number, newValue: number, oldValue: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    if (this.get(x, y) === oldValue) {
      this.set(x, y, newValue);
      this.floodFillValue(x - 1, y, newValue, oldValue);
      this.floodFillValue(x + 1, y, newValue, oldValue);
      this.floodFillValue(x, y - 1, newValue, oldValue);
      this.floodFillValue(x, y + 1, newValue, oldValue);
    }
  }

  drawLine(point1: Point, point2: Point, value: number): UndoableEdit {
    const rect = new Rect(point1.x, point1.y, point2.x, point2.y);
    const oldData = this.getArea(rect);
    PixelRenderer.drawLine(point1, point2, (x, y) => {
      this.setValue(new Point(x, y), value);
    });
    return new GridUndoableEdit(this, rect, oldData);
  }

  private countValues(rect: Rect): number {
    return this.getValueMap(rect).size;
  }

  private getValueMap(rect: Rect): Map<number, number> {
    const map = new Map<number, number>();
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const value = this.get(x, y);
        map.set(value, map.get(value) ? map.get(value) + 1 : 1);
      }
    }
    return map;
  }

  private change(rect: Rect, oldValue: number, newValue): void {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (this.get(x, y) === oldValue) {
          this.set(x, y, newValue);
        }
      }
    }
    this.notifyChanges(this.getSize());
  }

  private applyAttributeMode(): void {
    switch (this.attributeMode) {
      case AttributeMode.NONE:
        break;
      case AttributeMode.EIGHT_X_ONE:
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x += 8) {
            this.applyAttributeModeTo(new Rect(x, y, 8, 1));
          }
        }
        break;
      case AttributeMode.EIGHT_X_EIGHT:
        for (let y = 0; y < this.height; y += 8) {
          for (let x = 0; x < this.width; x += 8) {
            this.applyAttributeModeTo(new Rect(x, y, 8, 8));
          }
        }
        break;
    }
  }

  private applyAttributeModeTo(rect: Rect): void {
    const map = this.getValueMap(rect);
    const sortedEntries = [...map.entries()].sort((e1, e2) => e2[1] - e1[1]);
    for (let i = 2; i < sortedEntries.length; i++) {
      this.change(rect, sortedEntries[i][0], sortedEntries[0][0]);
    }
  }
}
