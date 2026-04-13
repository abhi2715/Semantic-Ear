import { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { motion } from 'framer-motion';
import SpriteText from 'three-spritetext';

export default function GraphTab({ memories }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [targetOpacity, setTargetOpacity] = useState(0);

  useEffect(() => {
    // Fade in gracefully
    setTimeout(() => setTargetOpacity(1), 300);

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const addNode = (id, group, val, name) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, { id, group, val, name });
        nodes.push(nodeMap.get(id));
      } else {
        nodeMap.get(id).val += val * 0.5; // Grow softly on mentions
      }
    };

    // Center Node (User)
    addNode('USER', 0, 15, 'You');

    memories.forEach(mem => {
      const memId = `mem_${mem.id}`;
      addNode(memId, 1, 5, `Memory: ${mem.category}`);
      links.push({ source: 'USER', target: memId, value: 2 });

      (mem.entities?.people || []).forEach(person => {
        const pId = `person_${person}`;
        addNode(pId, 2, 8, person);
        links.push({ source: memId, target: pId, value: 5 });
        links.push({ source: 'USER', target: pId, value: 1 });
      });

      (mem.entities?.places || []).forEach(place => {
        const pId = `place_${place}`;
        addNode(pId, 3, 6, place);
        links.push({ source: memId, target: pId, value: 3 });
      });
      
      (mem.entities?.topics || []).slice(0, 3).forEach(topic => {
        const tId = `topic_${topic}`;
        addNode(tId, 4, 4, topic);
        links.push({ source: memId, target: tId, value: 2 });
      });
    });

    return { nodes, links };
  }, [memories]);

  const getNodeColor = (node) => {
    switch(node.group) {
        case 0: return '#ec4899'; // pink
        case 1: return '#8b5cf6'; // purple
        case 2: return '#10b981'; // emerald
        case 3: return '#3b82f6'; // blue
        case 4: return '#f59e0b'; // amber
        default: return '#9ca3af'; // gray
    }
  };

  return (
    <motion.div
        ref={containerRef}
        className="w-full h-[70vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative border border-gray-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: targetOpacity, scale: 1 }}
        transition={{ duration: 0.8 }}
    >
        <div className="absolute top-6 left-6 z-10 text-white select-none pointer-events-none drop-shadow-md">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">Memory Web 3D</h2>
            <p className="text-gray-400 mt-1 max-w-sm text-sm">Drag to rotate. Scroll to zoom. Hover over nodes to examine neural connections.</p>
        </div>

        {memories.length === 0 ? (
             <div className="flex w-full h-full items-center justify-center text-white">
                <p>Not enough memories to build a Semantic Graph. Record some audio!</p>
             </div>
        ) : (
            <ForceGraph3D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeAutoColorBy="group"
                nodeRelSize={4}
                nodeVal={node => node.val}
                nodeThreeObject={node => {
                  const sprite = new SpriteText(node.name);
                  sprite.color = getNodeColor(node);
                  sprite.textHeight = Math.max(3, node.val * 0.4);
                  sprite.fontWeight = 'bold';
                  return sprite;
                }}
                nodeLabel={() => ''}
                linkWidth={link => link.value}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={d => d.value * 0.001}
                backgroundColor="#111827" 
            />
        )}
    </motion.div>
  );
}
