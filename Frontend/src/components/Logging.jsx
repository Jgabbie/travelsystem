import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Logging() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/logs/get-logs', {
                    withCredentials: true
                });
                setLogs(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch logs", err);
                alert("Access Denied or Error fetching logs");
                navigate('/login');
            }
        };

        fetchLogs();
    }, [navigate]);

    return (
        <div style={{ padding: "20px" }}>
            <h2>Logging</h2>
            {loading ? (
                <p>Loading logs...</p>
            ) : (
                <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f2f2f2" }}>
                            <th>Date/Time</th>
                            <th>Action</th>
                            <th>Performed By</th>
                            <th>Details</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log._id}>
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                <td>{log.action}</td>
                                <td>
                                    {log.performedBy ? (
                                        <>
                                            <strong>{log.performedBy.username}</strong><br/>
                                            <small>{log.performedBy.email}</small>
                                        </>
                                    ) : "Unknown User"}
                                </td>
                                <td>
                                    <pre style={{ margin: 0 }}>{JSON.stringify(log.details, null, 2)}</pre>
                                </td>
                                <td>{log.ipAddress}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}