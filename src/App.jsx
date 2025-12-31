import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Search, Github, Share2, ExternalLink, Code, AlertCircle, Copy, Check, Key, Linkedin, Instagram, Users, BookOpen, MapPin, Link as LinkIcon, Star, GitFork, TrendingUp, Zap, Award } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const GRADIENT_COLORS = ['#0EA5E9', '#06B6D4', '#10B981', '#84CC16', '#F59E0B', '#EF4444', '#EC4899', '#D946EF'];

export default function App() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [topRepos, setTopRepos] = useState([]);
  const [repoStats, setRepoStats] = useState({ totalStars: 0, totalForks: 0, avgStars: 0 });
  const [repoCount, setRepoCount] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // URL params handling to allow sharing ?user=username
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const userParam = params.get('user');
      if (userParam) {
        setUsername(userParam);
        fetchData(userParam);
      }
    } catch (e) {
      console.log("Could not parse URL parameters:", e);
    }
  }, []);

  const fetchData = async (userToFetch = username) => {
    if (!userToFetch?.trim()) {
      setError("Please enter a GitHub username first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setData(null);
    setUserProfile(null);

    try {
      const headers = { Accept: 'application/vnd.github+json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Fetch user profile data
      const userResponse = await fetch(`https://api.github.com/users/${userToFetch}`, { headers });
      
      if (!userResponse.ok) {
        if (userResponse.status === 404) throw new Error("User not found. Check the username.");
        if (userResponse.status === 403) throw new Error("API Rate limit exceeded. Wait a while or add a GitHub Token below.");
        if (userResponse.status === 401) throw new Error("Invalid GitHub Token.");
        throw new Error(`GitHub API Error: ${userResponse.status} ${userResponse.statusText}`);
      }

      const profile = await userResponse.json();
      setUserProfile(profile);

      // Fetch all public repos with pagination (GitHub caps at 100 per page)
      const perPage = 100;
      let page = 1;
      let allRepos = [];

      while (true) {
        const response = await fetch(`https://api.github.com/users/${userToFetch}/repos?per_page=${perPage}&sort=updated&page=${page}`, { headers });
        
        if (!response.ok) {
          if (response.status === 404) throw new Error("User not found. Check the username.");
          if (response.status === 403) throw new Error("API Rate limit exceeded. Wait a while or add a GitHub Token below.");
          if (response.status === 401) throw new Error("Invalid GitHub Token.");
          throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const repos = await response.json();
        allRepos = allRepos.concat(repos);

        // Stop if we received fewer than a full page or after a safe max of 10 pages to prevent runaway loops
        if (repos.length < perPage || page >= 10) break;
        page += 1;
      }

      setRepoCount(allRepos.length);

      if (allRepos.length === 0) {
        throw new Error("No public repositories found for this user.");
      }

      const langMap = {};
      let hasLang = false;
      allRepos.forEach(repo => {
        if (repo.language) {
          langMap[repo.language] = (langMap[repo.language] || 0) + 1;
          hasLang = true;
        }
      });

      if (!hasLang) {
         throw new Error("Repositories found, but no language data detected.");
      }

      const processedData = Object.keys(langMap)
        .map(lang => ({ name: lang, value: langMap[lang] }))
        .sort((a, b) => b.value - a.value);

      // Calculate repo statistics
      const totalStars = allRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
      const totalForks = allRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
      const avgStars = Math.round(totalStars / allRepos.length);

      // Get top 5 most starred repos
      const top5Repos = allRepos
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 5)
        .map(repo => ({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          description: repo.description,
          url: repo.html_url,
          language: repo.language,
        }));

      setRepoStats({ totalStars, totalForks, avgStars });
      setTopRepos(top5Repos);
      setData(processedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    try {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('user', username);
      window.history.pushState({}, '', newUrl);
    } catch (err) {
      // Ignore history errors
    }
    fetchData();
  };

  const handleExample = () => {
    setUsername('torvalds');
    fetchData('torvalds');
  };

  const generateMarkdown = () => {
    let appUrl = '';
    try {
      // If running on actual site, use current URL
      if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('sandbox')) {
         appUrl = window.location.href.split('?')[0] + `?user=${username}`;
      } else {
         throw new Error("Local/Sandbox");
      }
    } catch (e) {
      // Fallback for when copying link from localhost or sandbox
      appUrl = `https://gunjan-ghangare.github.io/GitHub-Lang-Detector/?user=${username}`;
    }
    return `[![My Top Languages](https://img.shields.io/badge/View%20My-Top%20Languages-blue?style=for-the-badge&logo=github)](${appUrl})`;
  };

  const generateHTMLEmbed = () => {
    let appUrl = '';
    try {
      if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('sandbox')) {
         appUrl = window.location.href.split('?')[0] + `?user=${username}`;
      } else {
         throw new Error("Local/Sandbox");
      }
    } catch (e) {
      appUrl = `https://gunjan-ghangare.github.io/GitHub-Lang-Detector/?user=${username}`;
    }
    
    return `<a href="${appUrl}" target="_blank" rel="noopener noreferrer">
  <img alt="GitLang Detector - ${username}'s Top Languages" src="https://img.shields.io/badge/📊_View-My_Top_Languages-3b82f6?style=for-the-badge&logo=github&logoColor=white" />
</a>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center w-full relative z-10">
        <div className="flex items-center justify-center gap-4 mb-4 animate-fade-in">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/50">
            <Github className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            GitLang Detector
          </h1>
        </div>
        <p className="text-slate-400 text-lg md:text-xl mb-2">
          🚀 Analyze your GitHub profile like never before
        </p>
        <p className="text-slate-500 text-sm">
          Language analytics • Profile insights • Repository performance
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-xl mx-auto mb-12 w-full relative z-10">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse"></div>
          <div className="relative flex flex-col gap-2 bg-slate-800/80 backdrop-blur-xl rounded-xl p-1 border border-slate-700/50">
            <div className="flex gap-2">
                <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter GitHub Username..."
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 placeholder-slate-500"
                />
                <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                >
                {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                    <>
                    <Search size={18} />
                    Analyze
                    </>
                )}
                </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
            <button 
                onClick={handleExample}
                className="text-sm text-slate-400 hover:text-blue-400 underline cursor-pointer transition-colors"
            >
                Try example: torvalds
            </button>
            
            <button 
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
                <Key size={12} />
                {showTokenInput ? "Hide API Token" : "Add API Token (if rate limited)"}
            </button>

            {showTokenInput && (
                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Paste GitHub Personal Access Token (optional)"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 text-center">
                        Token is only used for this session and not stored.
                    </p>
                </div>
            )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-200">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {data && userProfile && (
        <div className="max-w-6xl mx-auto w-full">
          {/* User Profile Dashboard */}
          <div className="mb-8 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500">
            <div className="grid md:grid-cols-4 gap-6 items-center">
              {/* Avatar & Basic Info */}
              <div className="md:col-span-1 flex flex-col items-center md:items-start group">
                <div className="relative mb-4">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile.name || userProfile.login}
                    className="relative w-32 h-32 rounded-full shadow-lg object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white text-center md:text-left">
                  {userProfile.name || userProfile.login}
                </h2>
                <p className="text-slate-400 text-sm font-medium">@{userProfile.login}</p>
                {userProfile.company && (
                  <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                    <Award size={14} /> {userProfile.company}
                  </p>
                )}
              </div>

              {/* Bio & Location */}
              <div className="md:col-span-2">
                {userProfile.bio && (
                  <p className="text-slate-300 text-sm mb-4 leading-relaxed italic border-l-2 border-blue-500 pl-4">
                    "{userProfile.bio}"
                  </p>
                )}
                {userProfile.location && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3 hover:text-slate-300 transition-colors">
                    <MapPin size={16} className="text-blue-400" />
                    {userProfile.location}
                  </div>
                )}
                {userProfile.blog && (
                  <a 
                    href={userProfile.blog} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    <LinkIcon size={16} />
                    {userProfile.blog}
                  </a>
                )}
              </div>

              {/* Stats Grid */}
              <div className="md:col-span-1 grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-4 rounded-xl text-center border border-blue-500/30 hover:border-blue-500/60 transition-all hover:scale-105 cursor-default">
                  <div className="flex items-center justify-center mb-2">
                    <Users size={16} className="text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Followers</p>
                  <p className="text-2xl font-black text-blue-400 mt-2">{userProfile.followers.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 p-4 rounded-xl text-center border border-purple-500/30 hover:border-purple-500/60 transition-all hover:scale-105 cursor-default">
                  <div className="flex items-center justify-center mb-2">
                    <Users size={16} className="text-purple-400" />
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Following</p>
                  <p className="text-2xl font-black text-purple-400 mt-2">{userProfile.following.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 p-4 rounded-xl text-center border border-emerald-500/30 hover:border-emerald-500/60 transition-all hover:scale-105 cursor-default">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Repos</p>
                  <p className="text-2xl font-black text-emerald-400 mt-2">{userProfile.public_repos.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-900/40 to-pink-800/20 p-4 rounded-xl text-center border border-pink-500/30 hover:border-pink-500/60 transition-all hover:scale-105 cursor-default">
                  <div className="flex items-center justify-center mb-2">
                    <Code size={16} className="text-pink-400" />
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Gists</p>
                  <p className="text-2xl font-black text-pink-400 mt-2">{userProfile.public_gists.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Repository Stats */}
            <div className="mt-6 grid md:grid-cols-3 gap-4 pt-6 border-t border-slate-700/50">
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/10 p-4 rounded-xl border border-yellow-500/30 text-center hover:border-yellow-500/60 transition-all">
                <div className="flex items-center justify-center mb-2">
                  <Star size={18} className="text-yellow-400" />
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-bold">Total Stars</p>
                <p className="text-3xl font-black text-yellow-400 mt-1">{repoStats.totalStars.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/10 p-4 rounded-xl border border-orange-500/30 text-center hover:border-orange-500/60 transition-all">
                <div className="flex items-center justify-center mb-2">
                  <GitFork size={18} className="text-orange-400" />
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-bold">Total Forks</p>
                <p className="text-3xl font-black text-orange-400 mt-1">{repoStats.totalForks.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/10 p-4 rounded-xl border border-cyan-500/30 text-center hover:border-cyan-500/60 transition-all">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp size={18} className="text-cyan-400" />
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-bold">Avg Stars</p>
                <p className="text-3xl font-black text-cyan-400 mt-1">{repoStats.avgStars.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Link to Profile & Social Media */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-4 font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Zap size={16} className="text-yellow-400" />
                  Connect & Follow
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a 
                  href={userProfile.html_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 group text-sm"
                >
                  <Github size={16} />
                  <span>GitHub Profile</span>
                  <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>

                {userProfile.twitter_username && (
                  <a 
                    href={`https://twitter.com/${userProfile.twitter_username}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white px-5 py-2.5 rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/50 group text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9 0 11-4s1-6.75-1-9.5a5.5 5.5 0 00-.5-.5z"/>
                    </svg>
                    <span>Twitter</span>
                    <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                )}

                {userProfile.blog && (
                  <a 
                    href={userProfile.blog}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-5 py-2.5 rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50 group text-sm"
                  >
                    <LinkIcon size={16} />
                    <span>Website</span>
                    <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Top Repos Section */}
          {topRepos.length > 0 && (
            <div className="mb-8 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl shadow-pink-500/10">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
                  <Star size={20} className="text-white" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
                  Top Performing Repositories
                </span>
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                {topRepos.map((repo, idx) => (
                  <a
                    key={idx}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-800 p-4 rounded-xl border border-slate-600/50 hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cursor-pointer hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors truncate flex-1">
                        {repo.name}
                      </h4>
                      <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                        #{idx + 1}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1 hover:text-yellow-400 transition-colors">
                        <Star size={14} fill="currentColor" /> {repo.stars}
                      </div>
                      <div className="flex items-center gap-1 hover:text-orange-400 transition-colors">
                        <GitFork size={14} /> {repo.forks}
                      </div>
                    </div>
                    {repo.language && (
                      <div className="mt-3 inline-block bg-slate-600/50 px-2 py-1 rounded text-xs text-slate-300">
                        {repo.language}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Chart Card 1: Pie */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                Language Distribution
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Card 2: Bar */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                Repo Count by Language
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                    <RechartsTooltip
                      cursor={{fill: '#334155'}}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl shadow-lg">
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Top Language</p>
              <p className="text-3xl font-bold mt-1">{data[0]?.name || 'N/A'}</p>
              <p className="text-blue-200 text-xs mt-2">Most frequently used primary language</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-xl shadow-lg">
              <p className="text-purple-200 text-sm font-medium uppercase tracking-wider">Total Repos Analyzed</p>
              <p className="text-3xl font-bold mt-1">{repoCount}</p>
              <p className="text-purple-200 text-xs mt-2">Public repositories fetched</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-xl shadow-lg">
              <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider">Diversity Score</p>
              <p className="text-3xl font-bold mt-1">{data.length}</p>
              <p className="text-emerald-200 text-xs mt-2">Different languages used</p>
            </div>
          </div>

          {/* Profile Embed Section */}
          <div className="mt-12 bg-slate-900 border border-slate-700 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                  <Share2 className="text-blue-400" size={24} />
                  Add to your GitHub Profile
                </h3>
                <p className="text-slate-400 mt-2 max-w-3xl">
                  Add this to your GitHub profile README.md to display your top languages and connect with visitors!
                </p>
              </div>
            </div>

            {/* HTML Version - Most Compatible */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h4 className="text-lg font-bold text-white">Recommended: HTML Version</h4>
                <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-bold">BEST FOR GITHUB</span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                This works best in GitHub README files. Paste this HTML code directly:
              </p>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative bg-black rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap break-all">{generateHTMLEmbed()}</pre>
                  <button
                    onClick={() => copyToClipboard(generateHTMLEmbed())}
                    className="absolute top-2 right-2 bg-green-600 hover:bg-green-500 text-white p-2 rounded-md transition-all"
                    title="Copy HTML"
                  >
                    {copied ? <Check size={18} className="text-white" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Markdown Version */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                <h4 className="text-lg font-bold text-white">Markdown Version</h4>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Alternative markdown format (works on GitHub, GitLab, Bitbucket, etc):
              </p>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative bg-black rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap break-all">{generateMarkdown()}</pre>
                  <button
                    onClick={() => copyToClipboard(generateMarkdown())}
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md transition-all"
                    title="Copy Markdown"
                  >
                    {copied ? <Check size={18} className="text-white" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
              <p className="font-bold mb-2">💡 How to use:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Copy the code above (HTML recommended)</li>
                <li>Go to your GitHub profile's README.md file</li>
                <li>Paste the code where you want it to appear</li>
                <li>Commit and your profile will show your top languages!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
      
      {/* Creator Section & Footer */}
      <div className="mt-auto pt-20">
        <div className="max-w-6xl mx-auto border-t border-slate-800 pt-8 pb-12 flex flex-col items-center">
            
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6">
            Meet the Creator
          </h3>
          
          <div className="flex items-center gap-8 mb-6">
            <a 
              href="https://github.com/gunjan-ghangare" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors"
              title="GitHub"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Github size={24} />
              </div>
              <span className="text-xs">GitHub</span>
            </a>

            <a 
              href="https://linkedin.com/in/gunjanghangare" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors"
              title="LinkedIn"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Linkedin size={24} />
              </div>
              <span className="text-xs">LinkedIn</span>
            </a>

            <a 
              href="https://instagram.com/gunjanghangare_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors"
              title="Instagram"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Instagram size={24} />
              </div>
              <span className="text-xs">Instagram</span>
            </a>
          </div>

          <p className="text-slate-500 text-sm">
            Designed & Built by <span className="text-slate-300 font-medium">Gunjan Ghangare</span>
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Copyright © {new Date().getFullYear()} Gunjan Ghangare. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
