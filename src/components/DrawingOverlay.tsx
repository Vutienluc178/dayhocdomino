import React, { useRef, useState, useEffect } from 'react';
import { Pen, Circle, Square, Minus, Eraser, Trash2, X, Plus } from 'lucide-react';

type Tool = 'pen' | 'circle' | 'ellipse' | 'rect' | 'parallelogram' | 'line' | 'dashedLine' | 'eraser';

interface DrawingOverlayProps {
  onClose: () => void;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({ onClose }) => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const resize = () => {
      const main = mainCanvasRef.current;
      const temp = tempCanvasRef.current;
      if (!main || !temp) return;
      
      const parent = main.parentElement;
      if (!parent) return;

      const tempMain = document.createElement('canvas');
      tempMain.width = main.width;
      tempMain.height = main.height;
      tempMain.getContext('2d')?.drawImage(main, 0, 0);

      main.width = parent.clientWidth;
      main.height = parent.clientHeight;
      temp.width = parent.clientWidth;
      temp.height = parent.clientHeight;

      main.getContext('2d')?.drawImage(tempMain, 0, 0);
    };

    const main = mainCanvasRef.current;
    if (!main || !main.parentElement) return;

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(main.parentElement);

    resize();
    return () => resizeObserver.disconnect();
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = tempCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);
    
    if (tool === 'pen' || tool === 'eraser') {
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, start: {x: number, y: number}, end: {x: number, y: number}, currentTool: Tool) => {
    ctx.beginPath();
    const w = end.x - start.x;
    const h = end.y - start.y;
    
    if (currentTool === 'line' || currentTool === 'dashedLine') {
      if (currentTool === 'dashedLine') ctx.setLineDash([10, 10]);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else if (currentTool === 'rect') {
      ctx.rect(start.x, start.y, w, h);
    } else if (currentTool === 'circle') {
      const r = Math.sqrt(w*w + h*h);
      ctx.arc(start.x, start.y, r, 0, 2 * Math.PI);
    } else if (currentTool === 'ellipse') {
      ctx.ellipse(start.x + w/2, start.y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2 * Math.PI);
    } else if (currentTool === 'parallelogram') {
      const offset = w * 0.2;
      ctx.moveTo(start.x + offset, start.y);
      ctx.lineTo(start.x + w, start.y);
      ctx.lineTo(start.x + w - offset, start.y + h);
      ctx.lineTo(start.x, start.y + h);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (tool === 'pen' || tool === 'eraser') {
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = lineWidth * 2;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      const tempCtx = tempCanvasRef.current?.getContext('2d');
      const tempCanvas = tempCanvasRef.current;
      if (!tempCtx || !tempCanvas) return;
      
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.lineWidth = lineWidth;
      tempCtx.strokeStyle = color;
      drawShape(tempCtx, startPos, pos, tool);
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (tool !== 'pen' && tool !== 'eraser') {
      const mainCtx = mainCanvasRef.current?.getContext('2d');
      const tempCtx = tempCanvasRef.current?.getContext('2d');
      const tempCanvas = tempCanvasRef.current;
      if (!mainCtx || !tempCtx || !tempCanvas) return;
      
      const pos = getPos(e);
      mainCtx.globalCompositeOperation = 'source-over';
      mainCtx.lineWidth = lineWidth;
      mainCtx.strokeStyle = color;
      drawShape(mainCtx, startPos, pos, tool);
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
  };

  const clear = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="absolute inset-0 z-[200] pointer-events-auto">
      <canvas ref={mainCanvasRef} className="absolute inset-0 w-full h-full" />
      <canvas 
        ref={tempCanvasRef} 
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {/* Toolbar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-2xl border border-slate-200 flex items-center gap-1 scale-90 origin-bottom">
        <div className="flex gap-0.5 border-r border-slate-200 pr-1">
          <button onClick={() => setTool('pen')} className={`p-1.5 rounded-lg transition-colors ${tool === 'pen' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Bút vẽ"><Pen size={16} /></button>
          <button onClick={() => setTool('line')} className={`p-1.5 rounded-lg transition-colors ${tool === 'line' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Đường thẳng"><Minus size={16} /></button>
          <button onClick={() => setTool('dashedLine')} className={`p-1.5 rounded-lg transition-colors ${tool === 'dashedLine' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Nét đứt"><div className="w-4 h-0 border-t-2 border-dashed border-current mt-1.5"></div></button>
          <button onClick={() => setTool('circle')} className={`p-1.5 rounded-lg transition-colors ${tool === 'circle' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Đường tròn"><Circle size={16} /></button>
          <button onClick={() => setTool('ellipse')} className={`p-1.5 rounded-lg transition-colors ${tool === 'ellipse' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Hình elip"><div className="w-4 h-2.5 border-2 border-current rounded-[50%] mt-0.5"></div></button>
          <button onClick={() => setTool('rect')} className={`p-1.5 rounded-lg transition-colors ${tool === 'rect' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Hình vuông/Chữ nhật"><Square size={16} /></button>
          <button onClick={() => setTool('parallelogram')} className={`p-1.5 rounded-lg transition-colors ${tool === 'parallelogram' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Hình bình hành">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="4 18 20 18 24 6 8 6 4 18"></polygon></svg>
          </button>
          <button onClick={() => setTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Tẩy"><Eraser size={16} /></button>
        </div>
        
        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-1.5 pl-1">
          <button onClick={() => setColor('#ef4444')} className={`w-5 h-5 rounded-full bg-red-500 border-2 ${color === '#ef4444' ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`} title="Đỏ" />
          <button onClick={() => setColor('#eab308')} className={`w-5 h-5 rounded-full bg-yellow-500 border-2 ${color === '#eab308' ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`} title="Vàng" />
          <button onClick={() => setColor('#22c55e')} className={`w-5 h-5 rounded-full bg-green-500 border-2 ${color === '#22c55e' ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-110'} transition-transform`} title="Xanh lá" />
          <button onClick={() => setColor('#ffffff')} className={`w-5 h-5 rounded-full bg-white border-2 ${color === '#ffffff' ? 'border-indigo-600 scale-110' : 'border-slate-300 hover:scale-110'} transition-transform`} title="Trắng" />
        </div>
        
        <div className="flex items-center gap-1 border-r border-slate-200 pr-1 pl-0.5">
          <button onClick={() => setLineWidth(Math.max(1, lineWidth - 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><Minus size={14} /></button>
          <span className="w-5 text-center text-xs font-medium">{lineWidth}</span>
          <button onClick={() => setLineWidth(Math.min(20, lineWidth + 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><Plus size={14} /></button>
        </div>
        
        <div className="flex gap-0.5 pl-0.5">
          <button onClick={clear} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Xóa toàn bộ"><Trash2 size={16} /></button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors" title="Đóng"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
};
