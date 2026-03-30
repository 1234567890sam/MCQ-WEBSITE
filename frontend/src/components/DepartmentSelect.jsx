import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function DepartmentSelect({ value, onChange, label = 'Department' }) {
    const [departments, setDepartments] = useState(['Computer Engineering']);
    const [isOther, setIsOther] = useState(false);
    const [customVal, setCustomVal] = useState('');

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const { data } = await api.get('/college/departments');
                if (data.departments?.length > 0) {
                    setDepartments(data.departments);
                }
            } catch (error) { console.error('Failed to fetch departments'); }
        };
        fetchDepts();
    }, []);

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (val === 'OTHER') {
            setIsOther(true);
            onChange(''); // Reset parent value until they type
        } else {
            setIsOther(false);
            onChange(val);
        }
    };

    const handleCustomChange = (e) => {
        setCustomVal(e.target.value);
        onChange(e.target.value);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label className="label">{label}</label>
            {!isOther ? (
                <select 
                    className="input" 
                    value={value || ''} 
                    onChange={handleSelectChange}
                >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="OTHER" style={{ fontWeight: 'bold', color: '#6366f1' }}>+ Add New Department (Other)</option>
                </select>
            ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        className="input" 
                        placeholder="Type new department name…" 
                        value={customVal} 
                        onChange={handleCustomChange}
                        autoFocus
                    />
                    <button 
                        type="button"
                        onClick={() => { setIsOther(false); setCustomVal(''); onChange(''); }}
                        className="btn-secondary"
                        style={{ padding: '0 0.75rem', fontSize: '0.75rem' }}
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
}
