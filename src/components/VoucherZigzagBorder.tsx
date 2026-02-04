import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface VoucherZigzagBorderProps {
  width: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  triangleCount?: number;
}

export default function VoucherZigzagBorder({
  width,
  height = 12,
  color = '#f0f4f8',
  backgroundColor = '#FFFFFF',
  triangleCount = 12,
}: VoucherZigzagBorderProps) {
  const triangleWidth = width / triangleCount;
  
  // Construir el path SVG para los triángulos zigzag que apuntan hacia arriba
  let pathData = `M 0,${height} `; // Empezar en la esquina inferior izquierda
  
  for (let i = 0; i < triangleCount; i++) {
    const x1 = i * triangleWidth;
    const x2 = x1 + triangleWidth / 2;
    const x3 = (i + 1) * triangleWidth;
    
    // Subir al pico del triángulo (hacia arriba)
    pathData += `L ${x2},0 `;
    // Bajar al siguiente valle
    pathData += `L ${x3},${height} `;
  }
  
  // Cerrar el path
  pathData += `L ${width},${height} L 0,${height} Z`;
  
  return (
    <View style={[styles.container, { width, height }]}>
      <Svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Path d={pathData} fill={color} stroke="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
});
