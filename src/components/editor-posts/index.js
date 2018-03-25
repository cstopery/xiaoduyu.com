import React from 'react';
// import PropTypes from 'prop-types'
import { reactLocalStorage } from 'reactjs-localstorage';

// redux
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { addPosts, updatePostsById } from '../../actions/posts';
import { loadTopics } from '../../actions/topic';
import { getTopicById, getTopicListByName } from '../../reducers/topic';
import { getPostsTypeById } from '../../reducers/posts-types';

// components
import Device from '../../common/device';
import Editor from '../editor';

// styles
import CSSModules from 'react-css-modules';
import styles from './style.scss';


@connect(
  (state, props) => ({
    topicList: getTopicListByName(state, 'write-posts'),
    getPostsTypeById: id => getPostsTypeById(state, id)
  }),
  dispatch => ({
    addPosts: bindActionCreators(addPosts, dispatch),
    loadTopics: bindActionCreators(loadTopics, dispatch),
    updatePostsById: bindActionCreators(updatePostsById, dispatch)
  })
)
@CSSModules(styles)
class WritePosts extends React.Component {

  static defaultProps = {
    type: 1,
    topic_id: null,
    _id: null,
    title: '',
    content: '',
    successCallback: ()=>{}
  }

  constructor(props) {
    super(props)

    const { _id, type, topic_id, title, content, getPostsTypeById, successCallback } = props

    this.state = {
      _id: _id,
      title: title,
      contentStateJSON: content,
      contentHTML: '',
      topic: topic_id,
      displayTopicsContainer: false,
      editor: <div></div>,
      type: getPostsTypeById(type),
      successCallback: successCallback,
      loading: false,
      editorElement: null
    }

    this.submit = this.submit.bind(this)
    this.titleChange = this.titleChange.bind(this)
    this.handleContentChange = this.handleContentChange.bind(this)
    this.selectedTopic = this.selectedTopic.bind(this)
    this.showTopicContainer = this.showTopicContainer.bind(this)
  }


  componentDidMount() {

    const self = this
    const { _id, type, title, contentStateJSON } = this.state

    const { topicList, loadTopics } = this.props

    if (!topicList.data) {
      loadTopics({
        id: 'write-posts',
        filters: {
          variables: {
            page_size: 1000
          }
        }
      });
    }


    if (_id) {
      var _content = contentStateJSON
      var _title = title
    } else {
      var _content = reactLocalStorage.get('posts-content') || ''
      var _title = reactLocalStorage.get('posts-title') || ''
    }

    this.setState({
      editor: <div>
          <Editor
            syncContent={this.handleContentChange}
            content={_content}
            placeholder={type.content}
            getEditor={(editor)=>{ self.setState({ editorElement: editor }) }}
          />
        </div>
    })

    this.refs.title.value = _title
  }


  titleChange(event) {

    if (this.state._id) return

    let { title } = this.refs
    reactLocalStorage.set('posts-title', title.value)
  }

  handleContentChange(contentStateJSON, contentHTML) {

    this.state.contentStateJSON = contentStateJSON
    this.state.contentHTML = contentHTML

    if (this.state._id) return

    reactLocalStorage.set('posts-content', contentStateJSON)
  }


  async submit() {

    let self = this
    let { title } = this.refs
    let { addPosts, updatePostsById } = this.props
    const { loading, _id, topic, contentStateJSON, contentHTML, type, successCallback, editorElement } = this.state

    if (loading) return
    if (!topic) return alert('您还未选择话题')
    if (!title.value) return title.focus()

    /*
    if (type._id == 2 || type._id == 3) {

      let str = contentHTML.replace(/\s/ig,'')
      str = str.replace(/<[^>]+>/g,"")

      if (type._id == 2 && str.length == 0) return editorElement.focus()
      if (type._id == 3 && str.length < 300) {
        alert('文章正文内容不能少于300字')
        editorElement.focus()
        return
      }
    }
    */

    self.setState({ loading: true })

    if (_id) {
      // 更新
      updatePostsById({
        id: _id,
        typeId: type._id,
        topicId: topic._id,
        title: title.value,
        content: contentStateJSON,
        contentHTML: contentHTML,
        callback: function(result) {
          self.setState({ loading: false })
          if (result && result.success) {
            successCallback()
          } else {
            alert(result && result.error ? result.error : '更新失败')
          }
        }
      })

      return
    }

    // 添加

    let [err, res] = await addPosts({
      title: title.value,
      detail: contentStateJSON,
      detailHTML: contentHTML,
      topicId: topic._id,
      device: parseInt(Device.getCurrentDeviceId()),
      type: type._id,
      // callback: function(res){
      //   if (res && res.success) {
      //
      //     setTimeout(()=>{
      //       reactLocalStorage.set('posts-content', '')
      //       reactLocalStorage.set('posts-title', '')
      //     }, 200)
      //
      //
      //     setTimeout(()=>{
      //       self.setState({ loading: false })
      //       successCallback(res.data)
      //     }, 1500)
      //
      //   } else {
      //     self.setState({ loading: false })
      //     alert(res.error)
      //   }
      // }
    });

    if (res && res.success) {
      setTimeout(()=>{
        reactLocalStorage.set('posts-content', '')
        reactLocalStorage.set('posts-title', '')
      }, 200);

      setTimeout(()=>{
        self.setState({ loading: false })
        successCallback(res)
      }, 1500);
    } else {
      self.setState({ loading: false })
      alert(res.error)
    }

  }

  selectedTopic(topic) {
    this.setState({ topic:topic })
    this.showTopicContainer()
  }

  showTopicContainer() {
    this.setState({ displayTopicsContainer: this.state.displayTopicsContainer ? false : true })
  }

  render() {
    const { editor, topic, type, displayTopicsContainer, loading } = this.state
    const { topicList } = this.props


    // 话题归类
    let parentTopicList = []
    let childTopicList = {}

    if (topicList.data) {

      for (let i = 0, max = topicList.data.length; i < max; i++) {

        let topic = topicList.data[i]

        if (!topic.parent_id) {
          parentTopicList.push(topic)
        } else {
          if (!childTopicList[topic.parent_id]) {
            childTopicList[topic.parent_id] = []
          }
          childTopicList[topic.parent_id].push(topic)
        }
      }
    }

    return (<div>
      <div className='container'>
        <div>

          {displayTopicsContainer ?
            <div styleName='node-selector'>
              <div styleName='mask' onClick={this.showTopicContainer}></div>
              <div styleName='topics-container'>
                <div>
                  <span styleName='close' onClick={this.showTopicContainer}></span>
                  <b>请选择一个话题</b>
                </div>
                {parentTopicList.map(item=>{
                  return (<div key={item._id}>
                            <div styleName='head'>{item.name}</div>
                            <div>
                              {childTopicList[item._id] && childTopicList[item._id].map(item=>{
                                return (<div
                                  key={item._id}
                                  styleName={topic && topic._id == item._id ? 'active' : 'topic'}
                                  onClick={()=>{this.selectedTopic(item)}}>{item.name}</div>)
                              })}
                            </div>
                          </div>)
                })}
              </div>

            </div>
            : null}

          {/* <div styleName='title'>
            <div onClick={this.showTopicContainer}>{topic ? topic.name : '选择话题'}</div>
            <input className="input" ref="title" type="text" onChange={this.titleChange} placeholder={type.title}  />
          </div> */}

          <div className="container">

            <div className="row">
              <div className="col-md-2">
                <div styleName="choose-topic-button" onClick={this.showTopicContainer}>{topic ? topic.name : '选择话题'}</div>
              </div>
              <div className="col-md-10">
                <input styleName="title" ref="title" type="text" onChange={this.titleChange} placeholder={type.title}  />
              </div>
            </div>

          </div>


          <div>{editor}</div>

          <button styleName="button" onClick={this.submit}>{loading ? '提交中...' : '提交'}</button>
        </div>
      </div>
    </div>)
  }

}

/*
WritePosts.defaultProps = {
  type: 1,
  topic_id: null,
  _id: null,
  title: '',
  content: '',
  successCallback: ()=>{}
}

WritePosts.propTypes = {
  addPosts: PropTypes.func.isRequired,
  topicList: PropTypes.object.isRequired,
  updatePostsById: PropTypes.func.isRequired
}

function mapStateToProps(state, props) {
  return {
    topicList: getTopicListByName(state, 'write-posts'),
    getPostsTypeById: (id)=>{
      return getPostsTypeById(state, id)
    }
  }
}

function mapDispatchToProps(dispatch) {
  return {
    addPosts: bindActionCreators(addPosts, dispatch),
    loadTopics: bindActionCreators(loadTopics, dispatch),
    updatePostsById: bindActionCreators(updatePostsById, dispatch)
  }
}

WritePosts = connect(mapStateToProps, mapDispatchToProps)(WritePosts)

*/
export default WritePosts
