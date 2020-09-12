import {Injectable} from '@angular/core';
import {ProjectData} from '../interfaces/project-data';
import {AssemblyFile} from '../classes/assemblyFile';
import {AttributeMode} from '../enums/attribute-mode';
import {PNG} from 'pngjs/browser';
import {Palette} from '../classes/palette';

export interface ExportOptions {
  columns: boolean;
  unpack: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }


  exportPNGFile(projectData: ProjectData, palette: Palette): ArrayBuffer {
    const png = new PNG({
      width: projectData.width,
      height: projectData.height,
      colorType: 6
    });
    let i = 0;
    for (let y = 0; y < projectData.height; y++) {
      for (let x = 0; x < projectData.width; x++) {
        const colorIndex = projectData.data[y][x];
        const color = palette.getColor(colorIndex);
        png.data[i++] = color.red;
        png.data[i++] = color.green;
        png.data[i++] = color.blue;
        png.data[i++] = colorIndex === 0 ? 0 : 255;
      }
    }
    return PNG.sync.write(png);
  }

  exportBinaryFile(projectData: ProjectData, palette: Palette): ArrayBuffer {
    const arrayBuffer = new Uint8Array(projectData.width * projectData.height / 2);
    let i = 0;
    for (let y = 0; y < projectData.height; y++) {
      for (let x = 0; x < projectData.width; x += 2) {
        arrayBuffer[i++] = (projectData.data[y][x] << 4) | projectData.data[y][x + 1];
      }
    }
    return arrayBuffer;
  }

  exportAssemblyFile(projectData: ProjectData, options: ExportOptions): string {
    const assemblyFile = new AssemblyFile();
    switch (projectData.attributeMode) {
      case AttributeMode.NONE:
        this.createLinearAssemblyFile(projectData, options, assemblyFile);
        break;
      case AttributeMode.EIGHT_X_ONE:
        this.createBitmapColorAssemblyFile(projectData, options, assemblyFile);
        break;
      case AttributeMode.EIGHT_X_EIGHT:
        this.createCharacterBasedAssemblyFile(projectData, options, assemblyFile);
        break;
    }
    return assemblyFile.toString();
  }

  private createLinearAssemblyFile(projectData: ProjectData, options: ExportOptions, assemblyFile: AssemblyFile): void {
    const section = assemblyFile.createSection('');
    if (options.unpack) {
      const section2 = assemblyFile.createSection('');
      if (options.columns) {
        for (let x = 0; x < projectData.width; x++) {
          for (let y = 0; y < projectData.height; y++) {
            const byte = projectData.data[y][x];
            section.write(byte << 4);
            section2.write(byte);
          }
        }
      } else {
        for (let y = 0; y < projectData.height; y++) {
          for (let x = 0; x < projectData.width; x++) {
            const byte = projectData.data[y][x];
            section.write(byte << 4);
            section2.write(byte);
          }
        }
      }
    } else {
      if (options.columns) {
        for (let x = 0; x < projectData.width; x += 2) {
          for (let y = 0; y < projectData.height; y++) {
            section.write((projectData.data[y][x] << 4) | projectData.data[y][x + 1]);
          }
        }
      } else {
        for (let y = 0; y < projectData.height; y++) {
          for (let x = 0; x < projectData.width; x += 2) {
            section.write((projectData.data[y][x] << 4) | projectData.data[y][x + 1]);
          }
        }
      }
    }
  }

  private createBitmapColorAssemblyFile(projectData: ProjectData, options: ExportOptions, assemblyFile: AssemblyFile): void {
    const patternSection = assemblyFile.createSection('patterns');
    const colorSection = assemblyFile.createSection('colors');
    const data = projectData.data;
    const cols = Math.floor(projectData.width / 8);
    const rows = Math.floor(projectData.height / 8);
    for (let row = 0; row < rows; row++) {
      const y0 = row * 8;
      for (let col = 0; col < cols; col++) {
        const x0 = col * 8;
        for (let y = y0; y < y0 + 8; y++) {
          const {foreColorIndex, backColorIndex, patternByte} =
            this.getPatternByte(x0, y, data, undefined, undefined, projectData.backColorIndex);
          patternSection.write(patternByte);
          const colorByte = (foreColorIndex << 4) | backColorIndex;
          colorSection.write(colorByte);
        }
      }
    }
  }

  private createCharacterBasedAssemblyFile(projectData: ProjectData, options: ExportOptions, assemblyFile: AssemblyFile): void {
    const patternSection = assemblyFile.createSection('patterns');
    const colorSection = assemblyFile.createSection('colors');
    const data = projectData.data;
    const cols = Math.floor(projectData.width / 8);
    const rows = Math.floor(projectData.height / 8);
    for (let row = 0; row < rows; row++) {
      const y0 = row * 8;
      for (let col = 0; col < cols; col++) {
        const x0 = col * 8;
        let foreColorIndex;
        let backColorIndex;
        for (let y = y0; y < y0 + 8; y++) {
          const result = this.getPatternByte(x0, y, data, foreColorIndex, backColorIndex, projectData.backColorIndex);
          foreColorIndex = result.foreColorIndex;
          backColorIndex = result.backColorIndex;
          patternSection.write(result.patternByte);
        }
        const colorByte = (foreColorIndex << 4) | backColorIndex;
        colorSection.write(colorByte);
      }
    }
  }

  private getPatternByte(
    x0: number,
    y0: number,
    data: number[][],
    foreColorIndex: number,
    backColorIndex: number,
    defaultBackColorIndex: number
  ): {foreColorIndex: number, backColorIndex: number, patternByte: number} {
    let patternByte = 0;
    let bit = 0x80;
    for (let x = x0; x < x0 + 8; x++) {
      const colorIndex = data[y0][x];
      if (foreColorIndex === undefined && colorIndex !== defaultBackColorIndex) {
        foreColorIndex = colorIndex;
      } else if (backColorIndex === undefined) {
        backColorIndex = colorIndex;
      }
      if (colorIndex === foreColorIndex) {
        patternByte |= bit;
      }
      bit >>>= 1;
    }
    return {foreColorIndex, backColorIndex, patternByte};
  }
}
